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
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

let PORT = process.env.PORT || 5000;
try {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Failed to connect to the database:", error);
  process.exit(1);
}