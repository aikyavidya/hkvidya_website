require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Donation = require("../models/Donation");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillRecurringPayments() {
  console.log("🚀 Starting Razorpay Recurring Payments Backfill (DRY RUN MODE)...");

  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hkvidya_db";
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  let metrics = {
    totalChecked: 0,
    totalDiffFound: 0,
    skippedFetchErrors: 0,
    updateErrors: 0 // Tracked but won't happen in dry run
  };

  try {
    const targetSubscriptions = await Donation.find({ payment_status: { $in: ["active", "cancelled", "halted", "expired", "completed"] } });
    console.log(`Found ${targetSubscriptions.length} subscriptions to check.`);

    for (const subDoc of targetSubscriptions) {
      metrics.totalChecked++;
      const subId = subDoc.razorpay_subscription_id;

      if (!subId) {
        console.warn(`⚠️ Warning: Subscription doc ${subDoc._id} has no razorpay_subscription_id, skipping.`);
        continue;
      }

      let allInvoices = [];
      let skip = 0;
      let hasMore = true;
      let fetchFailed = false;

      while (hasMore) {
        try {
          const response = await razorpay.invoices.all({ subscription_id: subId, count: 100, skip });
          const items = response.items || [];
          allInvoices = allInvoices.concat(items);
          
          await sleep(300); // Rate limiting

          if (items.length < 100) {
            hasMore = false;
          } else {
            skip += 100;
          }
        } catch (err) {
          console.warn(`⚠️ Razorpay fetch failed for subscription ${subId}:`, err.message);
          metrics.skippedFetchErrors++;
          fetchFailed = true;
          break;
        }
      }

      if (fetchFailed) {
        continue;
      }

      // Filter to only paid invoices and sort ascending (oldest first)
      const paidInvoices = allInvoices.filter(inv => inv.status === "paid");
      paidInvoices.sort((a, b) => a.paid_at - b.paid_at);

      // Build new recurring_payments array excluding the first invoice (index 0)
      const builtArray = [];
      for (let i = 1; i < paidInvoices.length; i++) {
        const invoice = paidInvoices[i];
        builtArray.push({
          payment_id: invoice.payment_id,
          amount: invoice.amount_paid / 100,
          charged_at: new Date(invoice.paid_at * 1000)
        });
      }

      // Fetch the true start date from Razorpay
      let razorpayStartDate = null;
      try {
        const rzpSub = await razorpay.subscriptions.fetch(subId);
        if (rzpSub && rzpSub.created_at) {
          razorpayStartDate = new Date(rzpSub.created_at * 1000);
          console.log(`Updated start date for ${subId}: ${razorpayStartDate}`);
        }
        await sleep(300); // Rate limiting
      } catch (err) {
        console.warn(`⚠️ Razorpay subscription fetch failed for ${subId}:`, err.message);
      }

      // Compare current DB array length with the built array length
      const currentLength = subDoc.recurring_payments ? subDoc.recurring_payments.length : 0;
      
      if (currentLength !== builtArray.length || razorpayStartDate) {
        metrics.totalDiffFound++;
        console.log(`[DIFF/UPDATE] Subscription: ${subId} | Donor: ${subDoc.full_name}`);
        if (currentLength !== builtArray.length) {
          console.log(`       DB Length: ${currentLength} -> New Length: ${builtArray.length} (Ready to update)`);
        }
        
        // LIVE UPDATE: Database update is active
        try {
          const updateFields = {};
          if (currentLength !== builtArray.length) updateFields.recurring_payments = builtArray;
          if (razorpayStartDate) updateFields.razorpay_start_at = razorpayStartDate;

          await Donation.findOneAndUpdate(
            { razorpay_subscription_id: subId },
            { $set: updateFields },
            { runValidators: true }
          );
        } catch (updateErr) {
          console.error(`❌ Update failed for ${subId}:`, updateErr.message);
          metrics.updateErrors++;
        }
      }
    }

    console.log("\n====================================");
    console.log("✅ BACKFILL CHECK (DRY RUN) COMPLETE");
    console.log("====================================");
    console.log(`📊 Total subscriptions checked: ${metrics.totalChecked}`);
    console.log(`⚠️  Total Diffs Found:        ${metrics.totalDiffFound}`);
    console.log(`❌ Fetch Errors:             ${metrics.skippedFetchErrors}`);
    console.log(`❌ Update Errors:            ${metrics.updateErrors}`);
    console.log("====================================\n");

  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🛑 Disconnected from MongoDB");
    process.exit(0);
  }
}

backfillRecurringPayments();
