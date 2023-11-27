const {
  getAllReviews,
  saveAreview,
} = require("../controllers/reviews.controller");

const router = require("express").Router();

router.get("/", getAllReviews);
router.post("/", saveAreview);

module.exports = router;
