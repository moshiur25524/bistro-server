const {
  getAllContacts,
  saveAcontact,
} = require("../controllers/contacts.controller");

const router = require("express").Router();

router.get("/", getAllContacts);
router.post("/", saveAcontact);

module.exports = router;
