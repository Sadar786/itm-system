import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: [true, "Item code is required"],
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      uppercase: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    defaultUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: [true, "Default unit is required"],
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    isPerishable: {
      type: Boolean,
      default: false,
      index: true,
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ description: 1, categoryId: 1 });

export default mongoose.model("Product", productSchema);