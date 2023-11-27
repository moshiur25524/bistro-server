const { getAllMenus } = require("../controllers/menu.controller");

const router = require("express").Router();

router.get("/", getAllMenus);

module.exports = router;
