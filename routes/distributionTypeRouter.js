const express = require("express");
const distributionTypeController =
  require("../controllers/distributionTypeController")();

const distributionTypeRouter = express.Router();

distributionTypeRouter.route("/").get(distributionTypeController.get);
distributionTypeRouter.route("/:id").get(distributionTypeController.getOne);

module.exports = distributionTypeRouter;
