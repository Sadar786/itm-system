import mongoose from "mongoose";

const transferSchema = new mongoose.Schema(
  {
    transferNo: {
      type: String,
      required: [true, "Transfer number is required"],
      unique: true,
      index: true,
      trim: true,
    },

    fromShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "From shop is required"],
      index: true,
    },

    toShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "To shop is required"],
      index: true,
    },

    transferDate: {
      type: Date,
      required: [true, "Transfer date is required"],
      index: true,
    },

    status: {
      type: String,
     // enum: ["draft", "posted", "cancelled"],
      enum: ["in_transit", "delivered", "cancelled"],
      default: "in_transit",
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

transferSchema.index({ fromShopId: 1, toShopId: 1, transferDate: -1 });

export default mongoose.model("Transfer", transferSchema);