const mongoose = require("mongoose");
const User = require("../models/user");
const Order = require("../models/order");
const Review = require("../models/review");
const Wishlist = require("../models/wishlist");
const { assertDataReady } = require("../lib/legacy-data");
async function prepareDatabase(config) {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName) {
      const error = new Error("MongoDB replica set diperlukan.");
      error.code = "REPLICA_SET_REQUIRED";
      throw error;
    }
    await require("./files").assertStorageReady(config);
    await assertDataReady(mongoose.connection, config);
    await User.createIndexes();
    await Wishlist.createIndexes();
    await Order.createIndexes();
    await Review.createIndexes();
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }
}
module.exports = { prepareDatabase };
