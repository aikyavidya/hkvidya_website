require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Donation = require("../models/Donation");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBackfill() {
  console.log("🚀 Starting Full Backfill for 'razorpay_start_at' and 'created_at'...");

  const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://hkvidya_admin:tpr_hkvidya%40admin@hkvidyacluster.i73cc1g.mongodb.net/hkvidya_db?retryWrites=true&w=majority&appName=hkvidyaCluster";
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  let metrics = {
    updated: 0,
    errors: 0,
    skipped: 0
  };

  try {
    const targetSubscriptions = await Donation.find({ 
      razorpay_subscription_id: { $exists: true, $ne: null } 
    });

    console.log(`Found ${targetSubscriptions.length} subscriptions.`);

    for (const subDoc of targetSubscriptions) {
      const subId = subDoc.razorpay_subscription_id;

      try {
        const rzpSub = await razorpay.subscriptions.fetch(subId);
        
        if (rzpSub && (rzpSub.start_at || rzpSub.created_at)) {
          // Razorpay returns unix timestamps in seconds
          const timestamp = rzpSub.start_at || rzpSub.created_at;
          const trueDate = new Date(timestamp * 1000);
          
          await Donation.updateOne(
            { _id: subDoc._id },
            { $set: { razorpay_start_at: trueDate, created_at: trueDate } }
          );

          console.log(`[UPDATING] Subscription ${subId} (${subDoc.email}) fixed. New Date: ${trueDate.toISOString()}`);
          metrics.updated++;
        } else {
           console.log(`[SKIPPING] Subscription ${subId} fetched, but no valid start/created timestamp.`);
           metrics.skipped++;
        }

        await sleep(300); // Respect Razorpay rate limits
      } catch (fetchErr) {
        console.error(`[ERROR] Failed to fetch or update ${subId}:`, fetchErr.message);
        metrics.errors++;
      }
    }

    console.log("\n====================================");
    console.log("✅ FULL BACKFILL COMPLETE");
    console.log("====================================");
    console.log(`Successfully updated ${metrics.updated} records`);
    console.log(`Skipped: ${metrics.skipped}`);
    console.log(`Errors: ${metrics.errors}`);
    console.log("====================================\n");

  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🛑 Disconnected from MongoDB");
    process.exit(0);
  }
}

runBackfill();
