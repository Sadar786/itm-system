import Category from "../models/Category.js";
import Unit from "../models/Unit.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().select("-__v").sort({ name: 1 });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("Get Categories Error:", error);
    return res.status(500).json({ success: false, message: "Unable to load categories" });
  }
};

export const getUnits = async (req, res) => {
  try {
    const units = await Unit.find().select("-__v").sort({ name: 1 });
    return res.status(200).json({ success: true, data: units });
  } catch (error) {
    console.error("Get Units Error:", error);
    return res.status(500).json({ success: false, message: "Unable to load units" });
  }
};
