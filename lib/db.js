import mongoose from "mongoose";
let cached = global._mongoose || (global._mongoose = { conn: null, p: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set. Add it to .env.local.");
  cached.p ||= mongoose.connect(process.env.MONGODB_URI).catch((err) => {
    cached.p = null; // let the next request try again instead of caching a dead connection attempt
    throw err;
  });
  cached.conn = await cached.p;
  return cached.conn;
}
