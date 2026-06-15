const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hkvidya_db";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully to:", MONGODB_URI))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

module.exports = mongoose;