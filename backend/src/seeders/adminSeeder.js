import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/User.js";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

  } catch (error) {

    console.error("Error connecting to MongoDB:", error);

    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {

    await connectDB();

    await User.deleteMany({
      email: "admin@test.com",
    });

    await User.create({
      name: "System Admin",
      email: "admin@test.com",
      password: "123456",
      role: "admin",
    });

    console.log("Admin Created");

    process.exit();

  } catch (error) {

    console.log(error);

    process.exit(1);
  }
};

seedAdmin();