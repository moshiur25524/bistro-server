const express = require("express");
const router = express.Router();

router.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
});

module.exports = router;
