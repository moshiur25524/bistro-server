const { reviewsCollection } = require("../model/allCollections");

module.exports.getAllReviews = async (req, res) => {
  const result = await reviewsCollection.find().toArray();
  res.send(result);
};

module.exports.saveAreview = async (req, res) => {
  const review = req.body;
  const result = await reviewsCollection.insertOne(review);
  res.send(result);
};
