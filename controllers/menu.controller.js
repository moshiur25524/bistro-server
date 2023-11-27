const { menuCollection } = require("../model/allCollections");

module.exports.getAllMenus = async (req, res) => {
  const result = await menuCollection.find().toArray();
  res.send(result);
};
