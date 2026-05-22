import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
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
      default: 0,
      min: 0,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: [true, "Unit is required"],
      index: true,
    },
    lastMovementAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.index({ shopId: 1, productId: 1 }, { unique: true });
inventorySchema.index({ shopId: 1, updatedAt: -1 });

export default mongoose.model("Inventory", inventorySchema);