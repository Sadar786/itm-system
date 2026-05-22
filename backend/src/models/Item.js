import mongoose from "mongoose";

const wasteSchema = new mongoose.Schema(
  {
    wasteNo: {
      type: String,
      required: [true, "Waste number is required"],
      unique: true,
      index: true,
      trim: true,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
      index: true,
    },

    wasteDate: {
      type: Date,
      required: [true, "Waste date is required"],
      index: true,
    },

    reason: {
      type: String,
      required: [true, "Waste reason is required"],
      trim: true,
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

wasteSchema.index({ shopId: 1, wasteDate: -1 });

export default mongoose.model("Waste", wasteSchema);