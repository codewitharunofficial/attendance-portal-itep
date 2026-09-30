import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import User from "@/models/User";
import { withErrorHandling, forbidden, notFound, badRequest } from "@/lib/apiError";

// POST { id, action: "approve" | "reject", ratePerHourMajor?, ratePerHourMinor? }
export const POST = withErrorHandling(async (req) => {
  if ((await getSession())?.role !== "admin") throw forbidden("Admins only.");
  await connectDB();
  const { id, action, ratePerHourMajor, ratePerHourMinor } = await req.json();
  if (!id || !["approve", "reject"].includes(action)) throw badRequest("Missing or invalid request.");

  const u = await User.findOne({ _id: id, status: "pending" });
  if (!u) throw notFound("Request not found (already handled?).");
  if (action === "reject") { await u.deleteOne(); return NextResponse.json({ ok: true }); }

  u.status = "active";
  if (u.role === "counsellor") {
    if (ratePerHourMajor !== undefined && ratePerHourMajor !== "") u.ratePerHourMajor = Math.max(0, +ratePerHourMajor || 0);
    if (ratePerHourMinor !== undefined && ratePerHourMinor !== "") u.ratePerHourMinor = Math.max(0, +ratePerHourMinor || 0);
  }
  await u.save();
  return NextResponse.json({ ok: true });
});
