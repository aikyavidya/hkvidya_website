require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Donation = require("../models/Donation");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSurgicalBackfill() {
  console.log("🚀 Starting Surgical Backfill for 'razorpay_start_at'...");

  // Connect to the production cluster as the primary fallback if MONGODB_URI is not explicitly defined in .env
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://hkvidya_admin:tpr_hkvidya%40admin@hkvidyacluster.i73cc1g.mongodb.net/hkvidya_db?retryWrites=true&w=majority&appName=hkvidyaCluster";
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  let metrics = {
    updated: 0,
    errors: 0,
    skipped: 0
  };

  try {
    // 1. Filter: Find only active subscriptions missing the razorpay_start_at field
    const targetSubscriptions = await Donation.find({ 
      payment_status: 'active', 
      razorpay_start_at: { $exists: false } 
    });

    console.log(`Found ${targetSubscriptions.length} subscriptions missing the start date.`);

    // 2. Iterate through filtered documents
    for (const subDoc of targetSubscriptions) {
      const subId = subDoc.razorpay_subscription_id;

      if (!subId) {
        console.log(`[SKIPPING] Document ${subDoc._id} has no razorpay_subscription_id.`);
        metrics.skipped++;
        continue;
      }

      try {
        // Fetch from Razorpay
        const rzpSub = await razorpay.subscriptions.fetch(subId);
        
        if (rzpSub && rzpSub.created_at) {
          const razorpayStartDate = new Date(rzpSub.created_at * 1000);
          
          // 3. Update the document directly
          await Donation.updateOne(
            { _id: subDoc._id },
            { $set: { razorpay_start_at: razorpayStartDate } }
          );

          console.log(`[UPDATING] Subscription ${subId} fixed. New Start Date: ${razorpayStartDate.toISOString()}`);
          metrics.updated++;
        } else {
           console.log(`[SKIPPING] Subscription ${subId} fetched, but 'created_at' was missing from Razorpay.`);
           metrics.skipped++;
        }

        await sleep(300); // Respect Razorpay rate limits
      } catch (fetchErr) {
        console.error(`[ERROR] Failed to fetch or update ${subId}:`, fetchErr.message);
        metrics.errors++;
      }
    }

    // 4. Monitoring: Final count
    console.log("\n====================================");
    console.log("✅ SURGICAL BACKFILL COMPLETE");
    console.log("====================================");
    console.log(`Successfully updated ${metrics.updated} records`);
    console.log(`Skipped: ${metrics.skipped}`);
    console.log(`Errors: ${metrics.errors}`);
    console.log("====================================\n");

  } catch (error) {
    console.error("❌ Script failed catastrophically:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🛑 Disconnected from MongoDB");
    process.exit(0);
  }
}

runSurgicalBackfill();
