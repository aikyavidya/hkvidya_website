// require("dotenv").config();
const Razorpay = require("razorpay");
const key_id = rzp_live_SRm4r1QeQbuoSE;
const key_secret = oeyTcLdrl0A8244Mb5PwxjBU;
const razorpay = new Razorpay({
  key_id: key_id,
  key_secret: key_secret,
});

module.exports = razorpay;
