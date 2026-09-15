import mongoose from "mongoose";

// Branch wastage is recorded independently of inventory and transfers.
const wasteSchema = new mongoose.Schema(
  {
    wasteNo: {
      type: String,
      required: [true, "Waste number is required"],
      unique: true,
      trim: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
    },
    wasteDate: {
      type: Date,
      required: [true, "Waste date is required"],
      default: Date.now,
    },
    reason: {
      type: String,
      required: [true, "Waste reason is required"],
      trim: true,
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
    },
  },
  { timestamps: true }
);

// Support branch history and the admin's history across all branches.
wasteSchema.index({ shopId: 1, wasteDate: -1 });
wasteSchema.index({ wasteDate: -1 });

export default mongoose.model("Waste", wasteSchema);
