import mongoose from "mongoose";
const S = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  month: { type: String, required: true },
  file: { type: Buffer, required: true },
}, { timestamps: true });
S.index({ user: 1, month: 1 }, { unique: true });
export default mongoose.models.Report || mongoose.model("Report", S);
