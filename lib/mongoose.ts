import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: Promise<typeof mongoose> | undefined;
}

export default async function dbConnect() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  if (!global._mongoose) {
    global._mongoose = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "pms",
    });
  }
  return global._mongoose;
}
