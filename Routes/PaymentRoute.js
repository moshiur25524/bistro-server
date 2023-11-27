const { getAllPayments } = require("../controllers/payments.controller");

const router = require("express").Router();

router.get("/", getAllPayments);

module.exports = router;
