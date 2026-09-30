// npm run seed  -> creates an admin and a sample counsellor
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model("User", new mongoose.Schema({
    name: String, email: { type: String, unique: true }, passwordHash: String, role: String,
    ratePerHourMajor: Number, ratePerHourMinor: Number, programme: String,
  }));
  const mk = async (name, email, pw, role, a = 0, b = 0) =>
    User.updateOne({ email }, { name, email, role, passwordHash: await bcrypt.hash(pw, 10), ratePerHourMajor: a, ratePerHourMinor: b, programme: "Mathematics (BSC BED)" }, { upsert: true });
  await mk("Admin", "admin@example.com", "admin123", "admin");
  await mk("Sample Counsellor", "counsellor@example.com", "counsellor123", "counsellor", 500, 300);
  console.log("Seeded. Change these passwords!");
  process.exit(0);
})();
