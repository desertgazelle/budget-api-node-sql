const express = require("express");
const monthController = require("../controllers/monthController")();

const monthRouter = express.Router();

monthRouter.route("/").post(monthController.post).get(monthController.get);
monthRouter.route("/:id").get(monthController.getOne);
module.exports = monthRouter;
