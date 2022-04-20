const express = require("express");
const expenseController = require("../controllers/expenseController")();

const expenseRouter = express.Router();

expenseRouter
  .route("/")
  .post(expenseController.post)
  .get(expenseController.get);
expenseRouter.use("/:expenseId", expenseController.getExpenseMiddleware);
expenseRouter
  .route("/:expenseId/amounts")
  .post(expenseController.postAmount)
  .get(expenseController.getAmounts);
expenseRouter.use(
  "/:expenseId/amounts/:amountId",
  expenseController.getAmountMiddleware
);
expenseRouter
  .route("/:expenseId/amounts/:amountId")
  .get(expenseController.getAmount)
  .put(expenseController.putAmount);
expenseRouter
  .route("/:expenseId")
  .get(expenseController.getOne)
  .put(expenseController.put);

module.exports = expenseRouter;
