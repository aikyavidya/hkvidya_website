const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  plan_type: { type: String },
  pan: { type: String },
  children_count: { type: Number },
  area_of_stay:   { type: String },
  address_line_1: { type: String },
  address_line_2: { type: String },
  pincode:        { type: String },
  city:           { type: String },
  locality:       { type: String },
  state:          { type: String },
  country:        { type: String },
  wants_80g:      { type: Boolean, default: false },
  razorpay_order_id: { type: String },
  razorpay_subscription_id: { type: String },
  payment_mode: { type: String },
  payment_status: { type: String, default: "pending" },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Donation", donationSchema);
