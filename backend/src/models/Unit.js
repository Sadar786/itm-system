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

    // Base unit for conversion
    // Example:
    // Gram      -> null
    // Kilogram  -> Gram
    // Ton       -> Gram
    // Liter     -> Milliliter
    baseUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
    },

    // Conversion factor to the base unit
    // Gram = 1
    // Kilogram = 1000
    // Ton = 1000000
    factor: {
      type: Number,
      default: 1,
      min: 1,
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