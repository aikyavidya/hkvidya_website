require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Donation = require("../models/Donation");

// Map Razorpay's native subscription statuses to our local payment_status vocabulary
const statusMap = {
  created: "pending",
  authenticated: "pending", 
  active: "active",
  pending: "pending",
  halted: "halted",
  cancelled: "cancelled",
  completed: "completed",
  expired: "expired"
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function reconcileSubscriptions() {
  console.log("🚀 Starting Razorpay Subscription Reconciliation...");

  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hkvidya_db";
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  let skip = 0;
  const count = 50; // Razorpay allows max 100, 50 is a safe pagination chunk
  let hasMore = true;

  let metrics = {
    totalChecked: 0,
    missingCreated: 0,
    mismatchedCorrected: 0,
    alreadyCorrect: 0,
  };

  try {
    while (hasMore) {
      console.log(`Fetching Razorpay subscriptions (skip: ${skip}, count: ${count})...`);
      const response = await razorpay.subscriptions.all({ skip, count });
      const subscriptions = response.items || [];

      if (subscriptions.length === 0) {
        hasMore = false;
        break;
      }

      for (const sub of subscriptions) {
        metrics.totalChecked++;
        
        // Use our mapped status, or fallback to Razorpay's exact string if unknown
        const mappedStatus = statusMap[sub.status] || sub.status;

        // Find the existing donation record
        const existingDoc = await Donation.findOne({ razorpay_subscription_id: sub.id });

        if (!existingDoc) {
          // NO MATCH FOUND: Create it
          
          // 1. Resolve amount primarily from notes, fallback to fetching plan
          let resolvedAmount = sub.notes?.amount ? Number(sub.notes.amount) : 0;
          
          if (!resolvedAmount) {
            try {
              if (sub.plan_id) {
                const plan = await razorpay.plans.fetch(sub.plan_id);
                resolvedAmount = plan.item.amount / 100;
              } else {
                console.warn(`⚠️ No amount in notes and no plan_id available on subscription ${sub.id}, defaulting amount to 0.`);
              }
            } catch (planErr) {
              console.warn(`⚠️ Could not determine amount for subscription ${sub.id} (Plan fetch failed):`, planErr.message);
            }
          }

          // 2. Build the full insert payload pulling everything available from notes
          const setOnInsert = {
            full_name: sub.notes?.full_name || "Unknown (created via reconcile)",
            email: sub.notes?.email || "unknown@reconcile.local",
            phone: sub.notes?.phone || "0000000000",
            pan: sub.notes?.pan || "",
            plan_type: sub.notes?.plan_type || "",
            children_count: sub.notes?.children_count ? Number(sub.notes.children_count) : undefined,
            amount: resolvedAmount,
            area_of_stay: sub.notes?.area_of_stay || "",
            address_line_1: sub.notes?.address || "",
            pincode: sub.notes?.pincode || "",
            city: sub.notes?.city || "",
            locality: sub.notes?.locality || "",
            state: sub.notes?.state || "",
            country: sub.notes?.country || "",
            wants_80g: sub.notes?.wants_80g === "true",
            payment_mode: "autopay",
          };

          await Donation.findOneAndUpdate(
            { razorpay_subscription_id: sub.id },
            { 
              $set: { payment_status: mappedStatus },
              $setOnInsert: setOnInsert
            },
            { upsert: true, runValidators: true }
          );
          
          metrics.missingCreated++;
          console.log(`➕ Created missing subscription: ${sub.id} (Status mapped to: ${mappedStatus}, Amount: ₹${resolvedAmount})`);
          
        } else {
          // MATCH FOUND: Check for status mismatch
          if (existingDoc.payment_status !== mappedStatus) {
            const oldStatus = existingDoc.payment_status;
            existingDoc.payment_status = mappedStatus;
            await existingDoc.save();
            
            metrics.mismatchedCorrected++;
            console.log(`🔄 Corrected subscription ${sub.id}: was '${oldStatus}' in DB, Razorpay reports '${sub.status}' -> updated to '${mappedStatus}'`);
          } else {
            metrics.alreadyCorrect++;
          }
        }
      }

      skip += count;

      // If we got fewer items back than requested, we've hit the end of the list
      if (subscriptions.length < count) {
        hasMore = false;
      }
    }

    console.log("\n====================================");
    console.log("✅ RECONCILIATION COMPLETE");
    console.log("====================================");
    console.log(`📊 Total Subscriptions Checked: ${metrics.totalChecked}`);
    console.log(`➕ Missing Records Created:     ${metrics.missingCreated}`);
    console.log(`🔄 Mismatches Corrected:        ${metrics.mismatchedCorrected}`);
    console.log(`👍 Already Correct in DB:       ${metrics.alreadyCorrect}`);
    console.log("====================================\n");

  } catch (error) {
    console.error("❌ Reconciliation failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🛑 Disconnected from MongoDB");
    process.exit(0);
  }
}

reconcileSubscriptions();
