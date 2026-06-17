require("dotenv").config();
const Razorpay = require("razorpay");
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;
const razorpay = new Razorpay({
  key_id: key_id,
  key_secret: key_secret,
});

module.exports = razorpay;
