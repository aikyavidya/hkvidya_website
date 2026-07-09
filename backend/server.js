require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
require("./config/db");
const Donation = require("./models/Donation");

// Contact form dependencies
const contactRoutes = require("./routes/contactRoutes");

const app = express();
app.use(cors());

// NOTE: /webhook must use raw body — mount BEFORE express.json()
app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(body);

    // Helper to safely extract required schema fields for new inserts
    const getSetOnInsert = (evt) => {
      const subscription = evt.payload.subscription?.entity || {};
      const payment = evt.payload.payment?.entity || {};
      const notes = subscription.notes || payment.notes || {};
      
      return {
        full_name: notes.full_name || "Unknown (created via webhook)",
        email: payment.email || notes.email || "unknown@webhook.local",
        phone: payment.contact || notes.phone || "0000000000",
        amount: payment.amount ? payment.amount / 100 : 0
      };
    };

    // 1. Subscription Activated
    if (event.event === "subscription.activated") {
      const subscriptionId = event.payload.subscription.entity.id;
      console.log("✅ Subscription activated:", subscriptionId);

      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          { 
            $set: { payment_status: "active" },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );
        
        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: activated). Placeholder values were used and may need manual correction.`);
        }
        console.log("✅ Donation status updated to active for:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to update active status:", err.message);
      }
    }

    // 2. Subscription Charged
    if (event.event === "subscription.charged") {
      const subscriptionId = event.payload.subscription.entity.id;
      const paymentId = event.payload.payment.entity.id;
      const chargedAmount = event.payload.payment.entity.amount / 100;

      console.log("✅ Subscription charged:", subscriptionId, "| Payment:", paymentId, "| Amount: ₹" + chargedAmount);

      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          {
            $set: { payment_status: "active" },
            $push: {
              recurring_payments: {
                payment_id: paymentId,
                amount: chargedAmount,
                charged_at: new Date()
              }
            },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );

        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: charged). Placeholder values were used and may need manual correction.`);
        }
        console.log("✅ Recurring payment recorded for subscription:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to record recurring payment:", err.message);
      }
    }

    // 3. Payment Failed
    if (event.event === "payment.failed") {
      const paymentId = event.payload.payment.entity.id;
      const subscriptionId = event.payload.payment.entity.subscription_id;
      console.log("❌ Payment failed:", paymentId, "| Subscription:", subscriptionId);
      if (subscriptionId) {
        try {
          const result = await Donation.findOneAndUpdate(
            { razorpay_subscription_id: subscriptionId },
            { 
              $set: { payment_status: "payment_failed" },
              $setOnInsert: getSetOnInsert(event)
            },
            { upsert: true, runValidators: true }
          );

          if (!result) {
            console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: payment.failed). Placeholder values were used and may need manual correction.`);
          }
          console.log("⚠️ Donation status updated to payment_failed for:", subscriptionId);
        } catch (err) {
          console.error("❌ Failed to update payment_failed status:", err.message);
        }
      }
    }

    // 4. Subscription Halted
    if (event.event === "subscription.halted") {
      const subscriptionId = event.payload.subscription.entity.id;
      console.log("🛑 Subscription halted:", subscriptionId);
      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          { 
            $set: { payment_status: "halted" },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );

        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: halted). Placeholder values were used and may need manual correction.`);
        }
        console.log("⚠️ Donation status updated to halted for:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to update halted status:", err.message);
      }
    }

    // 5. Subscription Cancelled
    if (event.event === "subscription.cancelled") {
      const subscriptionId = event.payload.subscription.entity.id;
      console.log("🚫 Subscription cancelled:", subscriptionId);
      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          { 
            $set: { payment_status: "cancelled" },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );

        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: cancelled). Placeholder values were used and may need manual correction.`);
        }
        console.log("⚠️ Donation status updated to cancelled for:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to update cancelled status:", err.message);
      }
    }

    // 6. Subscription Paused
    if (event.event === "subscription.paused") {
      const subscriptionId = event.payload.subscription.entity.id;
      console.log("⏸️ Subscription paused:", subscriptionId);
      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          { 
            $set: { payment_status: "paused" },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );

        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: paused). Placeholder values were used and may need manual correction.`);
        }
        console.log("⚠️ Donation status updated to paused for:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to update paused status:", err.message);
      }
    }

    // 7. Subscription Resumed
    if (event.event === "subscription.resumed") {
      const subscriptionId = event.payload.subscription.entity.id;
      console.log("▶️ Subscription resumed:", subscriptionId);
      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          { 
            $set: { payment_status: "active" },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );

        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: resumed). Placeholder values were used and may need manual correction.`);
        }
        console.log("✅ Donation status updated to active (resumed) for:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to update resumed status:", err.message);
      }
    }

    // 8. Subscription Completed
    if (event.event === "subscription.completed") {
      const subscriptionId = event.payload.subscription.entity.id;
      console.log("✅ Subscription completed:", subscriptionId);
      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          { 
            $set: { payment_status: "completed" },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );

        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: completed). Placeholder values were used and may need manual correction.`);
        }
        console.log("✅ Donation status updated to completed for:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to update completed status:", err.message);
      }
    }

    // 9. Subscription Pending
    if (event.event === "subscription.pending") {
      const subscriptionId = event.payload.subscription.entity.id;
      console.log("⏳ Subscription pending:", subscriptionId);
      try {
        const result = await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          { 
            $set: { payment_status: "payment_pending" },
            $setOnInsert: getSetOnInsert(event)
          },
          { upsert: true, runValidators: true }
        );

        if (!result) {
          console.warn(`⚠️ WARNING: Created new Donation record via webhook upsert for subscription ${subscriptionId} (Event: pending). Placeholder values were used and may need manual correction.`);
        }
        console.log("⚠️ Donation status updated to payment_pending for:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to update payment_pending status:", err.message);
      }
    }

    res.json({ status: "ok" });
  }
);

app.use(express.json());
app.use("/api", contactRoutes);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/*
===============================
HELPER: GET OR CREATE PLAN
===============================
*/

const getOrCreatePlan = async (amount) => {
  const amountInPaise = amount * 100;

  // Fetch existing plans
  const plans = await razorpay.plans.all({ count: 100 });

  const existingPlan = plans.items.find(
    (p) => p.item.amount === amountInPaise && p.period === "monthly"
  );

  if (existingPlan) {
    console.log("✅ Reusing existing plan:", existingPlan.id);
    return existingPlan.id;
  }

  // Create new plan
  const newPlan = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: `Monthly Donation ₹${amount}`,
      amount: amountInPaise,
      currency: "INR",
      description: "Monthly donation subscription",
    },
  });

  console.log("🆕 Created new plan:", newPlan.id);

  return newPlan.id;
};

/*
===============================
CREATE SUBSCRIPTION
(Saves "pending" record to DB immediately)
===============================
*/

app.post("/create-subscription", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      pan,
      planType,
      childrenCount,
      customAmount,
      paymentMethod,
    } = req.body;

    // Input validation
    if (!fullName || !email || !phone) {
      return res
        .status(400)
        .json({ error: "fullName, email, and phone are required" });
    }

    let baseAmount = 0;
    let finalAmount = 0;
    let planId = "";

    /*
    ===============================
    PLAN RESOLUTION
    ===============================
    */

    if (planType === "education") {
      baseAmount = 800;
    } else if (planType === "food-education") {
      baseAmount = 1000;
    } else if (planType === "complete") {
      baseAmount = 1500;
    } else if (planType === "custom") {
      if (!customAmount || customAmount <= 0) {
        return res.status(400).json({ error: "Invalid custom amount" });
      }
      baseAmount = customAmount;
    } else {
      return res.status(400).json({ error: "Invalid plan" });
    }

    finalAmount = baseAmount * childrenCount;

    planId = await getOrCreatePlan(finalAmount);

    /*
    ===============================
    CREATE SUBSCRIPTION
    ===============================
    */

    const totalCount = paymentMethod === "upi" ? 114 : 240;

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: totalCount,
      notes: {
        full_name: fullName,
        email: email,
        phone: phone,
        pan: pan || "",
        plan_type: planType,
        children_count: String(childrenCount),
        amount: String(finalAmount)
      }
    });

    // Create a pending record in MongoDB
    try {
      const pendingDonation = new Donation({
        full_name: fullName,
        email: email,
        phone: phone,
        pan: pan,
        plan_type: planType,
        children_count: childrenCount,
        amount: finalAmount,
        razorpay_subscription_id: subscription.id,
        payment_mode: "autopay",
        payment_status: "pending",
      });
      await pendingDonation.save();
      console.log("✅ Pending donation saved — ID:", pendingDonation._id);
    } catch (dbError) {
      console.error(`⚠️ Failed to save pending record for subscription ${subscription.id}:`, dbError.message);
      // Do not throw error here, so the frontend still receives the subscription payload
    }

    // Return subscription ID to the frontend
    res.json({
      success: true,
      subscription: subscription
    });
  } catch (error) {
    console.error("SUBSCRIPTION ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/*
===============================
TEST ROUTE — ₹1 EVERY 8 DAYS
(TEMPORARY — remove after testing)
===============================
*/
app.post("/create-test-subscription", async (req, res) => {
  try {
    // Step 1: Check if a ₹1 daily test plan already exists
    const plans = await razorpay.plans.all({ count: 100 });
    const existingPlan = plans.items.find(
      (p) => p.item.amount === 100 && p.period === "daily"
    );

    let planId;

    if (existingPlan) {
      console.log("✅ Reusing existing test plan:", existingPlan.id);
      planId = existingPlan.id;
    } else {
      // Step 2: Create new ₹1 daily plan with interval 8
      const newPlan = await razorpay.plans.create({
        period: "daily",
        interval: 8,
        item: {
          name: "Test Subscription ₹1",
          amount: 100,
          currency: "INR",
          description: "Testing recurring deduction every 8 days",
        },
      });
      console.log("🆕 Created new test plan:", newPlan.id);
      planId = newPlan.id;
    }

    // Step 3: Create subscription on that plan
    // total_count: 3 means it will charge 3 times total
    // (day 0, day 8, day 16) — enough to confirm 2 recurring cuts
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 3,
    });

    console.log("🆕 Test subscription created:", subscription.id);
    res.json({ success: true, subscription });

  } catch (error) {
    console.error("TEST SUBSCRIPTION ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/*
===============================
VERIFY SUBSCRIPTION + SAVE/UPDATE TO DB
(Called by frontend after Razorpay payment handler fires)
===============================
*/

app.post("/verify-subscription", async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      fullName,
      email,
      phone,
      pan,
      planType,
      childrenCount,
      customAmount,
      amount,
      areaOfStay,
      addressLine1,
      addressLine2,
      pincode,
      city,
      locality,
      state,
      country,
      wants80G,
    } = req.body;

    // Verify Razorpay signature
    const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    // Update Razorpay subscription notes with the full data payload
    try {
      await razorpay.subscriptions.update(razorpay_subscription_id, {
        notes: {
          full_name: fullName,
          email: email,
          phone: phone,
          pan: pan || "",
          plan_type: planType,
          children_count: String(childrenCount),
          amount: String(amount),
          area_of_stay: areaOfStay || "",
          address: [addressLine1, addressLine2].filter(Boolean).join(", "),
          pincode: pincode || "",
          city: city || "",
          locality: locality || "",
          state: state || "",
          country: country || "",
          wants_80g: String(wants80G)
        }
      });
      console.log("✅ Razorpay subscription notes updated:", razorpay_subscription_id);
    } catch (notesErr) {
      console.warn("⚠️ Failed to update Razorpay subscription notes:", notesErr.message);
      // We don't throw here to ensure the local DB record is still updated successfully
    }

    // Signature valid — update existing pending donation, or create if missing (fallback)
    try {
      const updateData = {
        full_name: fullName,
        email: email,
        phone: phone,
        pan: pan,
        plan_type: planType,
        children_count: childrenCount,
        amount: amount,
        area_of_stay: areaOfStay,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        pincode: pincode,
        city: city,
        locality: locality,
        state: state,
        country: country,
        wants_80g: wants80G,
        payment_mode: "autopay",
        payment_status: "active",
      };

      const updatedDonation = await Donation.findOneAndUpdate(
        { razorpay_subscription_id: razorpay_subscription_id },
        { $set: updateData },
        { new: true, upsert: true, runValidators: true }
      );

      console.log(
        "✅ DONATION VERIFIED & UPDATED — ID:", 
        updatedDonation._id, 
        "in DB:", mongoose.connection.db.databaseName
      );

      res.json({ success: true });
    } catch (dbError) {
      console.error("❌ Failed to update/save verified donation in DB:", dbError.message);
      res.status(500).json({ success: false, error: dbError.message });
    }
  } catch (error) {
    console.error("VERIFY ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/*
===============================
START SERVER
===============================
*/

app.listen(5000, () => console.log("Server running on port 5000"));
