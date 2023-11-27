const {
  allBookings,
  saveAbooking,
  removeAbooking,
} = require("../controllers/bookings.controller");

const router = require("express").Router();

router.get("/", allBookings);
router.post("/", saveAbooking);
router.delete("/:id", removeAbooking);

module.exports = router;
