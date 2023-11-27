const { ObjectId } = require("mongodb");
const { bookingCollection } = require("../model/allCollections");

module.exports.allBookings = async (req, res) => {
  const result = await bookingCollection.find({}).toArray();
  res.send(result);
};

module.exports.saveAbooking = async (req, res) => {
  const booking = req.body;
  const result = await bookingCollection.insertOne(booking);
  res.send(result);
};

module.exports.removeAbooking = async (req, res) => {
  const { id } = req.params;
  const result = await bookingCollection.deleteOne({
    _id: new ObjectId(id),
  });
  console.log(result);
  res.send(result);
};
