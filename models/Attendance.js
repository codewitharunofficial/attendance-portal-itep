import mongoose from "mongoose";
const S = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },        // YYYY-MM-DD (IST), set by server
  courseCode: { type: String, required: true, trim: true, uppercase: true },
  timeIn: { type: String, required: true },      // HH:MM
  timeOut: { type: String, required: true },
  type: { type: String, enum: ["Major", "Minor"], required: true },
  topic: { type: String, default: "" },
  studentsAssigned: Number, studentsAttended: Number, km: { type: Number, default: 0 },
  lat: Number, lng: Number, distanceM: Number,
}, { timestamps: true });
S.index({ user: 1, date: 1 }); // fast per-counsellor monthly queries
export default mongoose.models.Attendance || mongoose.model("Attendance", S);
