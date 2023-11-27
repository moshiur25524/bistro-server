const { paymentCollection } = require("../model/allCollections");

module.exports.getAllPayments = async (req, res) => {
  const result = await paymentCollection.find({}).toArray();
  res.send(result);
};
