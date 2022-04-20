const express = require("express");
const categoryController = require("../controllers/categoryController")();

const categoryRouter = express.Router();

categoryRouter
  .route("/")
  .get(categoryController.get)
  .post(categoryController.post);

categoryRouter.use("/:id", categoryController.getCategoryMiddleware);

categoryRouter
  .route("/:id")
  .get(categoryController.getOne)
  .put(categoryController.put);

module.exports = categoryRouter;
