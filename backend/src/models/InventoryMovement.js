import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema(
  {
    movementNo: {
      type: String,
      required: [true, "Movement number is required"],
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

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
      index: true,
    },

    movementType: {
      type: String,
      enum: ["IN", "TRANSFER_OUT", "TRANSFER_IN", "WASTE", "ADJUSTMENT"],
      required: [true, "Movement type is required"],
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

    quantityEffect: {
      type: Number,
      required: [true, "Quantity effect is required"],
    },

    fromShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },

    toShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },

    referenceType: {
      type: String,
      enum: ["Transfer", "Waste", "StockReceipt", "Adjustment"],
      required: [true, "Reference type is required"],
      index: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Reference ID is required"],
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

    movementDate: {
      type: Date,
      required: [true, "Movement date is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

inventoryMovementSchema.index({ shopId: 1, movementDate: -1 });
inventoryMovementSchema.index({ productId: 1, movementDate: -1 });
inventoryMovementSchema.index({ movementType: 1, movementDate: -1 });
inventoryMovementSchema.index({ shopId: 1, productId: 1, movementDate: -1 });

export default mongoose.model("InventoryMovement", inventoryMovementSchema);