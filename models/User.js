import mongoose from "mongoose";
const S = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  programme: { type: String, default: "" },
  status: { type: String, enum: ["pending", "active"], default: "active" },
  role: { type: String, enum: ["counsellor", "admin"], default: "counsellor" },
  ratePerHourMajor: { type: Number, default: 0 },
  ratePerHourMinor: { type: Number, default: 0 },
}, { timestamps: true });
export default mongoose.models.User || mongoose.model("User", S);
