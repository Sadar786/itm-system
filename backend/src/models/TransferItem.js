import mongoose from "mongoose";


const transferItemSchema = new mongoose.Schema(
  {
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transfer",
      required: [true, "Transfer is required"],
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

transferItemSchema.index({ transferId: 1, productId: 1 });

export default mongoose.model("TransferItem", transferItemSchema);