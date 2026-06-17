// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const Razorpay = require("razorpay");
// const crypto = require("crypto");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// app.post("/create-order", async (req, res) => {
//   try {
//     const { amount, name, email, phone } = req.body;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ error: "Invalid amount" });
//     }

//     const order = await razorpay.orders.create({
//       amount: amount * 100,
//       currency: "INR",
//       receipt: "receipt_" + Date.now(),
//       notes: { name, email, phone },
//     });

//     res.json(order);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post("/verify-payment", (req, res) => {
//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature,
//   } = req.body;

//   const body = razorpay_order_id + "|" + razorpay_payment_id;

//   const expectedSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//     .update(body)
//     .digest("hex");

//   if (expectedSignature === razorpay_signature) {
//     res.json({ success: true });
//   } else {
//     res.status(400).json({ success: false });
//   }
// });

// app.listen(process.env.PORT || 5000, () =>
//   console.log("Server running on port 5000")
// );

//implementing mysql database below

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const Razorpay = require("razorpay");
// const crypto = require("crypto");
// const db = require("./config/db");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const razorpayBank = new Razorpay({
//   key_id: process.env.RAZORPAY_BANK_KEY_ID,
//   key_secret: process.env.RAZORPAY_BANK_SECRET
// });

// const razorpayUPI = new Razorpay({
//   key_id: process.env.RAZORPAY_UPI_KEY_ID,
//   key_secret: process.env.RAZORPAY_UPI_SECRET
// });

// /*
// ===============================
// 1️⃣ CREATE ORDER + SAVE DONOR
// ===============================
// */

// app.post("/create-bank-order", async (req, res) => {
//   try {

//     const { fullName, email, phone, pan, planType, childrenCount, amount } = req.body;

//     console.log("Bank API received amount:", amount);

//     const order = await razorpayBank.orders.create({
//       amount: amount * 100,
//       currency: "INR",
//       receipt: "bank_" + Date.now()
//     });

//     console.log("Bank Razorpay amount (paise):", order.amount);

//     await db.execute(
//       `INSERT INTO donors
//        (full_name, email, phone, pan, plan_type, children_count, amount, razorpay_order_id, payment_mode)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         fullName,
//         email,
//         phone,
//         pan,
//         planType,
//         childrenCount,
//         amount,
//         order.id,
//         "bank_enach"
//       ]
//     );

//     res.json(order);

//   } catch (error) {
//     console.error("BANK ORDER ERROR:", error);  // 👈 ADD THIS
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post("/create-upi-order", async (req, res) => {
//   try {

//     const { fullName, email, phone, pan, planType, childrenCount, amount } = req.body;

//     console.log("UPI API received amount:", amount);

//     const order = await razorpayUPI.orders.create({
//       amount: amount * 100,
//       currency: "INR",
//       receipt: "upi_" + Date.now()
//     });

//     console.log("UPI Razorpay amount (paise):", order.amount);

//     await db.execute(
//       `INSERT INTO donors
//        (full_name,email,phone,pan,plan_type,children_count,amount,razorpay_order_id,payment_mode)
//        VALUES (?,?,?,?,?,?,?,?,?)`,
//       [
//         fullName,
//         email,
//         phone,
//         pan,
//         planType,
//         childrenCount,
//         amount,
//         order.id,
//         "upi_enach"
//       ]
//     );

//     res.json(order);

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// /*
// ===============================
// 2️⃣ VERIFY PAYMENT
// ===============================
// */

// app.post("/verify-payment", async (req, res) => {

//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature
//   } = req.body;

//   const body = razorpay_order_id + "|" + razorpay_payment_id;

//   const bankSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_BANK_SECRET)
//     .update(body)
//     .digest("hex");

//   const upiSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_UPI_SECRET)
//     .update(body)
//     .digest("hex");

//   if (bankSignature === razorpay_signature || upiSignature === razorpay_signature) {

//     await db.execute(
//       `UPDATE donors SET razorpay_payment_id=? WHERE razorpay_order_id=?`,
//       [razorpay_payment_id, razorpay_order_id]
//     );

//     res.json({ success: true });

//   } else {
//     res.status(400).json({ success: false });
//   }
// });

// app.listen(5000, () =>
//   console.log("Server running on port 5000")
// );

//updated code is below

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const Razorpay = require("razorpay");
// const db = require("./config/db");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_BANK_KEY_ID,
//   key_secret: process.env.RAZORPAY_BANK_SECRET
// });

// /*
// ===============================
// CREATE SUBSCRIPTION (AUTOPAY)
// ===============================
// */

// app.post("/create-subscription", async (req, res) => {
//   try {
//     const {
//       fullName,
//       email,
//       phone,
//       pan,
//       planType,
//       childrenCount
//     } = req.body;

//     let amount = 0;

//    if (planType === "education") amount = 800;
//    else if (planType === "food-education") amount = 1000;
//    else if (planType === "complete") amount = 1500;

//     let planId = "";

//     // 👉 Map frontend plan → Razorpay plan
//     if (planType === "education") planId = "plan_SSedvRfVSTjI8W";
//     else if (planType === "food-education") planId = "plan_SSefAxfzZUbUS5";
//     else if (planType === "complete") planId = "plan_SSegFkIF03pob7";
//     else {
//       return res.status(400).json({ error: "Invalid plan" });
//     }

//     let subscriptions = [];

//     // 🔥 Create subscription per child
//     for (let i = 0; i < childrenCount; i++) {

//       // 1. Create customer
// const customers = await razorpay.customers.all({
//   email: email
// });

// let customer;

// if (customers.items.length > 0) {
//   customer = customers.items[0]; // ✅ reuse
// } else {
//   customer = await razorpay.customers.create({
//     name: fullName,
//     email: email,
//     contact: phone
//   });
// }

// // 2. Create subscription
// const subscription = await razorpay.subscriptions.create({
//   plan_id: planId,
//   customer_id: customer.id,
//   customer_notify: 1,
//   total_count: 12
// });

//       // Save each subscription
//       await db.execute(
//         `INSERT INTO donors
//          (full_name, email, phone, pan, plan_type, children_count, amount, razorpay_subscription_id, payment_mode)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           fullName,
//           email,
//           phone,
//           pan,
//           planType,
//           1, // per child
//           amount,
//           subscription.id,
//           "autopay"
//         ]
//       );

//       subscriptions.push(subscription);
//     }

//     res.json({
//       success: true,
//       subscriptions
//     });

//   } catch (error) {
//     console.error("SUBSCRIPTION ERROR:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.listen(5000, () =>
//   console.log("Server running on port 5000")
// );

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const Razorpay = require("razorpay");
// const db = require("./config/db");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// /*
// ===============================
// HELPER: GET OR CREATE PLAN
// ===============================
// */

// const  = async (amount) => {
//   const amountInPaise = amount * 100;

//   // 1️⃣ Fetch existing plans
//   const plans = await razorpay.plans.all({ count: 100 });

//   // 2️⃣ Try to find matching plan
//   const existingPlan = plans.items.find(
//     (p) =>
//       p.item.amount === amountInPaise &&
//       p.period === "monthly"
//   );

//   if (existingPlan) {
//     console.log("✅ Reusing existing plan:", existingPlan.id);
//     return existingPlan.id;
//   }

//   // 3️⃣ Create new plan if not found
//   const newPlan = await razorpay.plans.create({
//     period: "monthly",
//     interval: 1,
//     item: {
//       name: `Custom Plan ₹${amount}`,
//       amount: amountInPaise,
//       currency: "INR",
//       description: "Custom monthly donation"
//     }
//   });

//   console.log("🆕 Created new plan:", newPlan.id);

//   return newPlan.id;
// };

// /*
// ===============================
// CREATE SUBSCRIPTION
// ===============================
// */

// app.post("/create-subscription", async (req, res) => {
//   try {
//     const {
//       fullName,
//       email,
//       phone,
//       pan,
//       planType,
//       childrenCount,
//       customAmount
//     } = req.body;

//     let amount = 0;
//     let planId = "";

//     /*
//     ===============================
//     DEFAULT PLANS
//     ===============================
//     */

//     if (planType === "education") {
//       amount = 800;
//       planId = "plan_SSedvRfVSTjI8W";
//     }
//     else if (planType === "food-education") {
//       amount = 1000;
//       planId = "plan_SSefAxfzZUbUS5";
//     }
//     else if (planType === "complete") {
//       amount = 1500;
//       planId = "plan_SSegFkIF03pob7";
//     }

//     /*
//     ===============================
//     CUSTOM PLAN (OPTIMIZED)
//     ===============================
//     */

//     else if (planType === "custom") {

//       if (!customAmount || customAmount <= 0) {
//         return res.status(400).json({ error: "Invalid custom amount" });
//       }

//       amount = customAmount;

//       // 🔥 OPTIMIZED PLAN HANDLING
//       planId = await getOrCreatePlan(customAmount);
//     }

//     else {
//       return res.status(400).json({ error: "Invalid plan" });
//     }

//     /*
//     ===============================
//     CUSTOMER (REUSE)
//     ===============================
//     */

//     const customers = await razorpay.customers.all({ email });

//     let customer;

//     if (customers.items.length > 0) {
//       customer = customers.items[0];
//     } else {
//       customer = await razorpay.customers.create({
//         name: fullName,
//         email,
//         contact: phone
//       });
//     }

//     /*
//     ===============================
//     CREATE SUBSCRIPTIONS
//     ===============================
//     */

//     let subscriptions = [];

//     for (let i = 0; i < childrenCount; i++) {

//       const subscription = await razorpay.subscriptions.create({
//         plan_id: planId,
//         customer_id: customer.id,
//         customer_notify: 1,
//         total_count: 12
//       });

//       await db.execute(
//         `INSERT INTO donors
//          (full_name, email, phone, pan, plan_type, children_count, amount, razorpay_subscription_id, payment_mode)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           fullName,
//           email,
//           phone,
//           pan,
//           planType,
//           1,
//           amount,
//           subscription.id,
//           "autopay"
//         ]
//       );

//       subscriptions.push(subscription);
//     }

//     res.json({
//       success: true,
//       subscriptions
//     });

//   } catch (error) {
//     console.error("SUBSCRIPTION ERROR:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.listen(5000, () =>
//   console.log("Server running on port 5000")
// );

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
require("./config/db");
const Donation = require("./models/Donation");

// Contact form dependencies
const contactRoutes = require("./routes/contactRoutes"); // this one is updated to import contact routes

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", contactRoutes); //this one updated to use contact routes

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
    (p) => p.item.amount === amountInPaise && p.period === "monthly",
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

    let baseAmount = 0;
    let finalAmount = 0;
    let planId = "";

    /*
    ===============================
    DEFAULT PLANS
    ===============================
    */

    if (planType === "education") {
      baseAmount = 800;
    } else if (planType === "food-education") {
      baseAmount = 1000;
    } else if (planType === "complete") {
      baseAmount = 1500;
    } else if (planType === "custom") {
      /*
    ===============================
    CUSTOM PLAN
    ===============================
    */
      if (!customAmount || customAmount <= 0) {
        return res.status(400).json({ error: "Invalid custom amount" });
      }

      baseAmount = customAmount;
    } else {
      return res.status(400).json({ error: "Invalid plan" });
    }

    /*
    ===============================
    FINAL AMOUNT (FIX 🔥)
    ===============================
    */

    finalAmount = baseAmount * childrenCount;

    /*
    ===============================
    PLAN HANDLING
    ===============================
    */

    planId = await getOrCreatePlan(finalAmount);

    /*
    ===============================
    CUSTOMER (REUSE)
    ===============================
    */

    const customers = await razorpay.customers.all({ email });

    let customer;

    if (customers.items.length > 0) {
      customer = customers.items[0];
    } else {
      customer = await razorpay.customers.create({
        name: fullName,
        email,
        contact: phone,
      });
    }

    /*
    ===============================
    CREATE SINGLE SUBSCRIPTION ✅
    ===============================
    */

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_id: customer.id,
      customer_notify: 1,
      total_count: 12,
    });

    /*
    ===============================
    SAVE TO DB
    ===============================
    */

    const donation = new Donation({
      full_name: fullName,
      email: email,
      phone: phone,
      pan: pan,
      plan_type: planType,
      children_count: childrenCount,
      amount: finalAmount,
      razorpay_subscription_id: subscription.id,
      payment_mode: "autopay",
    });
    await donation.save();

    /*
    ===============================
    RESPONSE
    ===============================
    */

    res.json({
      success: true,
      subscriptions: [subscription],
    });
  } catch (error) {
    console.error("SUBSCRIPTION ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/*
===============================
START SERVER
===============================
*/

app.listen(5000, () => console.log("Server running on port 5000"));
