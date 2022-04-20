require("mssql");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const camelizeKeys = require("../services/coreService");
const validAmountService = require("../services/validAmountService")();

function expenseController() {
  function get(req, res) {
    (async function getExpenses() {
      try {
        const results = await req.app.locals.db.query(
          `SELECT e.Id, e.Name, e.CategoryId, c.Name as CategoryName, e.DistributionTypeId, d.Name as DistributionTypeName, t.ValidAmountId, t.Amount, t.EndDate, t.StartDate
FROM Expenses AS e
INNER JOIN Categories AS c ON e.CategoryId = c.Id
INNER JOIN DistributionTypes AS d ON e.DistributionTypeId = d.Id
LEFT JOIN (
  SELECT e0.ExpenseId, e0.ValidAmountId, v.Id, v.Amount, v.EndDate, v.StartDate
  FROM ExpenseValidAmounts AS e0
  INNER JOIN ValidAmounts AS v ON e0.ValidAmountId = v.Id
) AS t ON e.Id = t.ExpenseId
ORDER BY e.Name, e.Id, c.Id, d.Id, t.StartDate DESC, t.ExpenseId, t.ValidAmountId, t.Id`
        );

        const expenses = await formatExpenses(
          results.recordset,
          req.app.locals.db
        );
        return res.json(camelizeKeys(expenses));
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  async function formatExpenses(results, sql) {
    const expenses = [];
    results.forEach(async (result) => {
      let expense = expenses.find((c) => c.Id == result.Id);
      if (expense === undefined) {
        expense = {
          Id: result.Id,
          Name: result.Name,
          CategoryId: result.CategoryId,
          Category: { Name: result.CategoryName },
          DistributionTypeId: result.DistributionTypeId,
          DistributionType: { Name: result.DistributionTypeName },
          AmountHistory: [],
        };
        expenses.push(expense);
      }
      if (result.ValidAmountId) {
        expense.AmountHistory.push(
          validAmountService.formatValidAmount(result, sql)
        );
      }
    });
    return expenses;
  }

  async function getOneExpenseRaw(expenseId, sql) {
    try {
      const results = await sql.query(
        `SELECT e.Id, e.Name, e.CategoryId, c.Name as CategoryName, e.DistributionTypeId, d.Name as DistributionTypeName, t.ValidAmountId, t.Amount, t.EndDate, t.StartDate
FROM Expenses AS e
INNER JOIN Categories AS c ON e.CategoryId = c.Id
INNER JOIN DistributionTypes AS d ON e.DistributionTypeId = d.Id
LEFT JOIN (
  SELECT e0.ExpenseId, e0.ValidAmountId, v.Id, v.Amount, v.EndDate, v.StartDate
  FROM ExpenseValidAmounts AS e0
  INNER JOIN ValidAmounts AS v ON e0.ValidAmountId = v.Id
) AS t ON e.Id = t.ExpenseId
WHERE e.Id='${expenseId}'
ORDER BY e.Name, e.Id, c.Id, d.Id, t.StartDate DESC, t.ExpenseId, t.ValidAmountId, t.Id`
      );

      if (results.rowsAffected[0] > 0) {
        const expenses = await formatExpenses(results.recordset, sql);
        return expenses[0];
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  async function getExpensesRaw(sql, monthId) {
    try {
      const results = await sql.query(
        `SELECT e.Id, e.Name, e.CategoryId, c.Name as CategoryName, e.DistributionTypeId, d.Name as DistributionTypeName, t.ValidAmountId, t.Amount, t.EndDate, t.StartDate
FROM Expenses AS e
INNER JOIN Categories AS c ON e.CategoryId = c.Id
INNER JOIN DistributionTypes AS d ON e.DistributionTypeId = d.Id
LEFT JOIN (
  SELECT e0.ExpenseId, e0.ValidAmountId, v.Id, v.Amount, v.EndDate, v.StartDate
  FROM ExpenseValidAmounts AS e0
  INNER JOIN ValidAmounts AS v ON e0.ValidAmountId = v.Id
  WHERE v.StartDate <= '${monthId}' AND (v.EndDate is NULL OR (v.EndDate is not NULL AND v.EndDate >= '${monthId}'))      
) AS t ON e.Id = t.ExpenseId
ORDER BY e.Name, e.Id, c.Id, d.Id, t.StartDate DESC, t.ExpenseId, t.ValidAmountId, t.Id`
      );

      if (results.rowsAffected[0] > 0) {
        const expenses = await formatExpenses(results.recordset, sql);
        return expenses;
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  function getExpenseMiddleware(req, res, next) {
    (async function getExpenseRaw() {
      try {
        const expense = await getOneExpenseRaw(
          req.params.expenseId,
          req.app.locals.db
        );

        if (expense) {
          req.expense = expense;
          return next();
        } else {
          return res.sendStatus(404);
        }
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  function getAmountMiddleware(req, res, next) {
    const amount = req.expense.AmountHistory.find(
      (s) => s.Id == req.params.amountId
    );
    if (amount) {
      req.Amount = amount;
      return next();
    } else {
      return res.sendStatus(404);
    }
  }

  async function getExpense(req, res) {
    return res.json(camelizeKeys(req.expense));
  }

  function getOne(req, res) {
    return getExpense(req, res);
  }

  function post(req, res) {
    (async function InsertExpense() {
      try {
        //Validate
        const results = await req.app.locals.db.query(
          `select * from Expenses where name='${req.body.name}'`
        );

        if (results.rowsAffected[0] === 0) {
          //Ajouter une dépense
          const id = uuidv4();
          await req.app.locals.db.query(
            `INSERT INTO Expenses (Id, Name, CategoryId, DistributionTypeId)
VALUES ('${id}','${req.body.name}','${req.body.categoryId}','${req.body.distributionTypeId}')`
          );

          const expense = await getOneExpenseRaw(id, req.app.locals.db);
          return res.json(camelizeKeys(expense));
        } else {
          res.status(400);
          return res.send("Name is already used");
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function put(req, res) {
    (async function UpdateExpense() {
      try {
        //Validate
        const results = await req.app.locals.db.query(
          `select * from Expenses where name='${req.body.name}' and id <> '${req.params.expenseId}'`
        );

        if (results.rowsAffected[0] === 0) {
          await req.app.locals.db.query(
            `UPDATE Expenses SET Name='${req.body.name}' WHERE id='${req.params.expenseId}'`
          );

          const expense = await getOneExpenseRaw(
            req.params.expenseId,
            req.app.locals.db
          );
          return res.json(camelizeKeys(expense));
        } else {
          res.status(400);
          return res.send("Name is already used");
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function postAmount(req, res) {
    (async function InsertAmount() {
      try {
        //Validation
        err = await validAmountService.isValid(
          req.body,
          req.expense.AmountHistory,
          req.app.locals.db
        );
        if (err) {
          res.status(400);
          return res.send(err);
        }
        const lastValidAmount = validAmountService.getLastValidAmount(
          req.expense.AmountHistory
        );

        //Ajout du montant
        const id = uuidv4();
        const startDate = moment(req.body.startDate)
          .format("YYYY-MM-DD")
          .toString();
        const endDate = moment(req.body.endDate)
          .format("YYYY-MM-DD")
          .toString();
        await req.app.locals.db.query(
          req.body.endDate
            ? `INSERT INTO ValidAmounts (Id, Amount, StartDate, EndDate) VALUES
('${id}', ${req.body.amount}, '${startDate}','${endDate}');
INSERT INTO ExpenseValidAmounts (ExpenseId, ValidAmountId)
VALUES ('${req.params.expenseId}', '${id}')`
            : `INSERT INTO ValidAmounts (Id, Amount, StartDate) VALUES
('${id}', ${req.body.amount}, '${startDate}');
INSERT INTO ExpenseValidAmounts (ExpenseId, ValidAmountId)
VALUES ('${req.params.expenseId}', '${id}')`
        );
        if (lastValidAmount) {
          const endDate = moment(req.body.startDate)
            .subtract(1, "M")
            .format("YYYY-MM-DD")
            .toString();
          await req.app.locals.db.query(
            `UPDATE ValidAmounts SET EndDate='${endDate}' WHERE id='${lastValidAmount.Id}'`
          );
        }
        res.status(201);
        return getAmounts(req, res);
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  function getAmounts(req, res) {
    (async function getExpenseAmounts() {
      try {
        const results = await req.app.locals.db.query(
          `SELECT c0.ExpenseId, c0.ValidAmountId, v.Amount, v.EndDate, v.StartDate
FROM ExpenseValidAmounts AS c0
INNER JOIN ValidAmounts AS v ON c0.ValidAmountId = v.Id
WHERE c0.ExpenseId = '${req.params.expenseId}'
ORDER BY v.StartDate DESC, c0.ValidAmountId`
        );

        const salaries = validAmountService.formatValidAmountHistory(
          results.recordset,
          req.app.locals.db
        );

        return res.json(camelizeKeys(salaries));
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  async function getOneAmount(req, res) {
    try {
      const results = await req.app.locals.db.query(
        `SELECT c0.ExpenseId, c0.ValidAmountId, v.Amount, v.EndDate, v.StartDate
FROM ExpenseValidAmounts AS c0
INNER JOIN ValidAmounts AS v ON c0.ValidAmountId = v.Id
WHERE c0.ExpenseId = '${req.params.expenseId}' and c0.ValidAmountId = '${req.params.amountId}'
ORDER BY v.StartDate DESC, c0.ValidAmountId`
      );

      if (results.rowsAffected[0] > 0) {
        const salaries = validAmountService.formatValidAmountHistory(
          results.recordset,
          req.app.locals.db
        );
        return res.json(camelizeKeys(salaries[0]));
      } else {
        return res.sendStatus(404);
      }
    } catch (error) {
      res.send(error.stack);
    }
  }

  function getAmount(req, res) {
    return getOneAmount(req, res);
  }

  function putAmount(req, res) {
    (async function UpdateAmount() {
      try {
        console.log(req.body);
        //Validation
        req.body.Id = req.params.amountId;
        err = await validAmountService.isValid(
          req.body,
          req.expense.AmountHistory,
          req.app.locals.db,
          true
        );
        if (err) {
          res.status(400);
          return res.send(err);
        }
        const lastValidAmount = validAmountService.getLastValidAmount(
          req.expense.AmountHistory,
          req.params.amountId
        );

        //Mise à jour du montant
        const startDate = moment(req.body.startDate)
          .format("YYYY-MM-DD")
          .toString();
        const endDate = req.body.endDate
          ? moment(req.body.endDate).format("YYYY-MM-DD").toString()
          : null;
        console.log(endDate);
        await req.app.locals.db.query(
          endDate
            ? `UPDATE ValidAmounts SET Amount='${req.body.amount}', StartDate='${startDate}', EndDate='${endDate}' WHERE id='${req.params.amountId}'`
            : `UPDATE ValidAmounts SET Amount='${req.body.amount}', StartDate='${startDate}', EndDate=NULL WHERE id='${req.params.amountId}'`
        );
        if (lastValidAmount) {
          const endDate = moment(req.body.startDate)
            .subtract(1, "M")
            .format("YYYY-MM-DD")
            .toString();
          await req.app.locals.db.query(
            `UPDATE ValidAmounts SET EndDate='${endDate}' WHERE id='${lastValidAmount.Id}'`
          );
        }

        return getAmounts(req, res);
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  return {
    getOne,
    get,
    post,
    put,
    postAmount,
    getAmounts,
    getAmount,
    putAmount,
    getExpenseMiddleware,
    getAmountMiddleware,
    getExpensesRaw,
  };
}

module.exports = expenseController;
