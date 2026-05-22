import app from "./app.js";
import connectDB from "./config/db.js";
import Unit from "./models/Unit.js";
import Inventory from "./models/Inventory.js";
import Shop from "./models/Shop.js";
import Product from "./models/Product.js";
import User from "./models/User.js";
import Category from "./models/Category.js";
import InventoryMovement from "./models/InventoryMovement.js";
import Item from "./models/Item.js";
import Transfer from "./models/Transfer.js";
import WasteItem from "./models/WasteItem.js";

connectDB();

app.listen(5000, () => {
  console.log("Server running on port 5000");
});