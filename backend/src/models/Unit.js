// src/models/Unit.js
import mongoose from "mongoose";

const unitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Unit name is required"],
      trim: true,
      unique: true,
      index: true,
    },
    shortName: {
      type: String,
      required: [true, "Short name is required"],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    isDecimalAllowed: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Unit", unitSchema);