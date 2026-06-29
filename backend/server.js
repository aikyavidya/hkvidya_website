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

    if (event.event === "subscription.charged") {
      const subscriptionId = event.payload.subscription.entity.id;
      const paymentId = event.payload.payment.entity.id;
      const chargedAmount = event.payload.payment.entity.amount / 100;

      console.log("✅ Subscription charged:", subscriptionId, "| Payment:", paymentId, "| Amount: ₹" + chargedAmount);

      try {
        await Donation.findOneAndUpdate(
          { razorpay_subscription_id: subscriptionId },
          {
            $set: { payment_status: "active" },
            $push: {
              recurring_payments: {
                payment_id: paymentId,
                amount: chargedAmount,
                charged_at: new Date()
              }
            }
          }
        );
        console.log("✅ Recurring payment recorded for subscription:", subscriptionId);
      } catch (err) {
        console.error("❌ Failed to record recurring payment:", err.message);
      }
    }

    if (event.event === "payment.failed") {
      console.log(
        "❌ Payment failed:",
        event.payload.payment.entity.id
      );
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
(Does NOT save to DB — payment not yet made)
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

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
    });

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
VERIFY SUBSCRIPTION + SAVE TO DB
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

    // Signature valid — save donation to DB
    const donation = new Donation({
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
      razorpay_subscription_id: razorpay_subscription_id,
      payment_mode: "autopay",
      payment_status: "active",
    });
    await donation.save();
    console.log("✅ DONATION SAVED — ID:", donation._id, "to DB:", mongoose.connection.db.databaseName, "on host:", mongoose.connection.host);

    res.json({ success: true });
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
