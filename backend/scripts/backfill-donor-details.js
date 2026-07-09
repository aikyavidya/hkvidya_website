require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Donation = require("../models/Donation");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper to avoid hitting Razorpay rate limits
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillDonorDetails() {
  console.log("🚀 Starting Backfill for Placeholder Donors...");

  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hkvidya_db";
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  try {
    // 1. Find all documents with the placeholder name
    const placeholderDocs = await Donation.find({ full_name: "Unknown (created via reconcile)" });
    
    let metrics = {
      totalProcessed: placeholderDocs.length,
      successCount: 0,
      unresolvedCount: 0,
      unresolvedIds: []
    };

    console.log(`Found ${metrics.totalProcessed} records needing backfill.`);

    if (metrics.totalProcessed === 0) {
      console.log("No records to process. Exiting.");
      return;
    }

    // 2. Loop through each document
    for (const doc of placeholderDocs) {
      const subId = doc.razorpay_subscription_id;
      
      if (!subId) {
        console.warn(`⚠️ Document ${doc._id} has no razorpay_subscription_id. Skipping.`);
        metrics.unresolvedCount++;
        metrics.unresolvedIds.push(`doc_id:${doc._id}`);
        continue;
      }

      console.log(`\nProcessing Subscription: ${subId}`);
      let resolvedData = null;

      try {
        // Fetch the subscription object
        const subscription = await razorpay.subscriptions.fetch(subId);
        await sleep(300); // Rate limit protection

        // Strategy A: Try Customer API
        if (subscription.customer_id) {
          const customer = await razorpay.customers.fetch(subscription.customer_id);
          await sleep(300);
          
          if (customer && (customer.name || customer.email || customer.contact)) {
            resolvedData = {
              full_name: customer.name || "Unknown",
              email: customer.email || "unknown@placeholder.local",
              phone: customer.contact || "0000000000"
            };
          }
        } 
        
        // Strategy B: Fallback to Invoice API if Customer API didn't yield results
        if (!resolvedData) {
          const invoices = await razorpay.invoices.all({ subscription_id: subId, count: 1 });
          await sleep(300);
          
          if (invoices && invoices.items && invoices.items.length > 0) {
            const customerDetails = invoices.items[0].customer_details;
            
            if (customerDetails && (customerDetails.customer_name || customerDetails.customer_email || customerDetails.customer_contact)) {
              resolvedData = {
                full_name: customerDetails.customer_name || "Unknown",
                email: customerDetails.customer_email || "unknown@placeholder.local",
                phone: customerDetails.customer_contact || "0000000000"
              };
            }
          }
        }

        // 3. Update the record if we found real data
        if (resolvedData) {
          doc.full_name = resolvedData.full_name;
          doc.email = resolvedData.email;
          doc.phone = resolvedData.phone;
          
          // Using save() natively prevents updating fields we didn't touch
          await doc.save(); 

          metrics.successCount++;
          console.log(`✅ Updated -> Name: ${resolvedData.full_name} | Email: ${resolvedData.email} | Phone: ${resolvedData.phone}`);
        } else {
          // 4. Leave record alone and log it if no data found
          console.log(`❌ No usable customer data found for ${subId}`);
          metrics.unresolvedCount++;
          metrics.unresolvedIds.push(subId);
        }

      } catch (err) {
        console.error(`❌ Error fetching data for ${subId}:`, err.message);
        metrics.unresolvedCount++;
        metrics.unresolvedIds.push(subId);
        await sleep(300); // Ensure sleep happens even on error
      }
    }

    // 5. Print final summary
    console.log("\n====================================");
    console.log("✅ BACKFILL COMPLETE");
    console.log("====================================");
    console.log(`📊 Total Records Processed: ${metrics.totalProcessed}`);
    console.log(`✨ Successfully Updated:    ${metrics.successCount}`);
    console.log(`⚠️  Still Unresolved:       ${metrics.unresolvedCount}`);
    
    if (metrics.unresolvedIds.length > 0) {
      console.log("\nList of Unresolved Subscription IDs:");
      metrics.unresolvedIds.forEach(id => console.log(` - ${id}`));
    }
    console.log("====================================\n");

  } catch (error) {
    console.error("❌ Backfill failed at a high level:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🛑 Disconnected from MongoDB");
    process.exit(0);
  }
}

backfillDonorDetails();
