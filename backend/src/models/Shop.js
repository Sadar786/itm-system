import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Shop name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Shop code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
      shopkeeperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

shopSchema.index({ name: 1 });

const Shop = mongoose.models.Shop || mongoose.model("Shop", shopSchema);

export default Shop;