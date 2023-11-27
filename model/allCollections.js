const client = require("../utils/mongoConnection");

const allCollections = {
  usersCollection: client.db("BistroDB").collection("users"),
  menuCollection: client.db("BistroDB").collection("menu"),
  reviewsCollection: client.db("BistroDB").collection("reviews"),
  cartCollection: client.db("BistroDB").collection("carts"),
  paymentCollection: client.db("BistroDB").collection("payments"),
  bookingCollection: client.db("BistroDB").collection("bookings"),
  contactCollection: client.db("BistroDB").collection("contacts"),
};

module.exports = allCollections;
