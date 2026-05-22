import mongoose from "mongoose";

const wasteItemSchema = new mongoose.Schema(
  {
    wasteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Waste",
      required: [true, "Waste is required"],
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
      index: true,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 0.000001,
    },

    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: [true, "Unit is required"],
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

wasteItemSchema.index({ wasteId: 1, productId: 1 }, { unique: true });

export default mongoose.model("WasteItem", wasteItemSchema);