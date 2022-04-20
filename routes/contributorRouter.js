const express = require("express");
const contributorController = require("../controllers/contributorController")();

const contributorRouter = express.Router();

contributorRouter.route("/").get(contributorController.get);
contributorRouter.use(
  "/:contributorId",
  contributorController.getContributorMiddleware
);
contributorRouter
  .route("/:contributorId/salaries")
  .post(contributorController.postSalary)
  .get(contributorController.getSalaries);
contributorRouter.use(
  "/:contributorId/salaries/:salaryId",
  contributorController.getSalaryMiddleware
);
contributorRouter
  .route("/:contributorId/salaries/:salaryId")
  .get(contributorController.getSalary)
  .put(contributorController.putSalary);
contributorRouter
  .route("/:contributorId")
  .get(contributorController.getOne)
  .put(contributorController.put);

module.exports = contributorRouter;
