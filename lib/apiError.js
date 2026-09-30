import { NextResponse } from "next/server";
import mongoose from "mongoose";

// Throw one of these from inside a route handler for a deliberate, user-facing error.
// e.g.  if (!user) throw notFound("Counsellor not found.");
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const badRequest = (m) => new HttpError(400, m);
export const unauthorized = (m = "You need to sign in first.") => new HttpError(401, m);
export const forbidden = (m = "You don't have permission to do that.") => new HttpError(403, m);
export const notFound = (m = "That wasn't found.") => new HttpError(404, m);
export const conflict = (m) => new HttpError(409, m);

function toResponse(err) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });

  // Body sent to the API wasn't valid JSON
  if (err instanceof SyntaxError) return NextResponse.json({ error: "That request wasn't formatted correctly." }, { status: 400 });

  // Mongoose schema validation (missing/invalid required fields on .create()/.save())
  if (err instanceof mongoose.Error.ValidationError) {
    const msg = Object.values(err.errors).map((e) => e.message).join(" ") || "Some fields are invalid.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  // Malformed id passed to a query (e.g. findById with a bad string)
  if (err instanceof mongoose.Error.CastError) return NextResponse.json({ error: "That record couldn't be found." }, { status: 400 });

  // Unique-index clash (duplicate email, etc.)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    return NextResponse.json({ error: `That ${field} is already in use.` }, { status: 409 });
  }
  // Can't reach / authenticate with MongoDB — surface this as a clear, non-crashing message
  // instead of a raw stack trace (this is what a bad MONGODB_URI or Atlas password looks like).
  if (["MongoServerError", "MongoServerSelectionError", "MongooseServerSelectionError", "MongoNetworkError"].includes(err?.name)) {
    console.error("Database connection error:", err);
    return NextResponse.json({ error: "We couldn't reach the database. Please try again shortly; if this keeps happening, ask your admin to check the database connection." }, { status: 503 });
  }

  console.error("Unexpected server error:", err);
  return NextResponse.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 });
}

// Wrap any route handler so thrown/rejected errors always come back as clean JSON instead of crashing.
export function withErrorHandling(handler) {
  return async (req, ctx) => {
    try { return await handler(req, ctx); }
    catch (err) { return toResponse(err); }
  };
}
