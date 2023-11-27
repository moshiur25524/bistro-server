const { contactCollection } = require("../model/allCollections");

module.exports.getAllContacts = async (req, res) => {
  try {
    const result = await contactCollection.find({}).toArray();
    res.send(result);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports.saveAcontact = async (req, res) => {
  try {
    const data = req.body;
    const result = await contactCollection.insertOne(data);
    res.send(result);
  } catch (error) {
    console.log(error.message);
  }
};
