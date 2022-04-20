require("mssql");
const moment = require("moment");
const camelizeKeys = require("../services/coreService");
const contributorController = require("../controllers/contributorController")();
const expenseController = require("../controllers/expenseController")();

function monthController() {
  function post(req, res) {
    (async function InsertMonth() {
      try {
        //Validate
        const results = await req.app.locals.db.query(
          `select * from Months where name='${req.body.id}'`
        );
        if (results.rowsAffected[0] === 0) {
          await req.app.locals.db.query(
            `INSERT INTO Months (Id) VALUES ('${req.body.id}')`
          );
          const results = await req.app.locals.db.query(
            `select * from Months where id='${id}'`
          );
          res.status(201);
          return res.json(camelizeKeys(results.recordset[0]));
        } else {
          res.status(400);
          return res.send("Month already exists.");
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function get(req, res) {
    (async function getMonths() {
      try {
        const results = await req.app.locals.db.query(
          `SELECT * FROM Months ORDER BY id DESC`
        );
        return res.json(
          camelizeKeys(
            results.recordset.map((m) => {
              const monthId = moment.utc(m.Id);
              return {
                id: monthId.format("YYYY-MM-DD"),
                name: monthId.format("YYYY MMM"),
                canEdit: false,
              };
            })
          )
        );
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  function getOne(req, res) {
    (async function getMonth() {
      try {
        const results = await req.app.locals.db.query(
          `SELECT * FROM Months WHERE id='${req.params.id}'`
        );
        const monthId = moment.utc(req.params.id);
        const month = {
          id: monthId.format("YYYY-MM-DD"),
          name: monthId.format("YYYY MMM"),
          canEdit: results.rowsAffected[0] == 0,
          contributors: [],
          expenses: [],
        };

        const contributors = await contributorController.getContributorsRaw(
          req.app.locals.db,
          monthId.format("YYYY-MM-DD").toString()
        );
        let totalSalaries = 0.0;
        contributors.forEach((c) => {
          c.Percentage =
            c.SalaryHistory && c.SalaryHistory.length == 1
              ? c.SalaryHistory[0].Amount
              : 0.0;
          totalSalaries = totalSalaries + c.Percentage;
        });
        contributors.forEach((c) => {
          c.Percentage = c.Percentage / totalSalaries;
          c.Percentage = c.Percentage.toFixed(1);
        });

        month.contributors = contributors.map((c) => {
          return {
            percentage: c.Percentage,
            id: c.Id,
            name: c.Name,
            amount: 0.0,
          };
        });

        let expenses = await expenseController.getExpensesRaw(
          req.app.locals.db,
          monthId.format("YYYY-MM-DD").toString()
        );
        expenses = expenses.filter(
          (e) => e.AmountHistory && e.AmountHistory.length > 0
        );

        month.expenses = expenses.map((e) => {
          return {
            name: e.Name,
            id: e.Id,
            category: {
              name: e.Category.Name,
            },
            categoryId: e.CategoryId,
            distributionType: {
              name: e.DistributionType.Name,
            },
            distributionTypeId: e.DistributionTypeId,
            amount: e.AmountHistory[0].Amount,
            amountDistribution: applyDistribution(e, month.contributors),
          };
        });

        month.contributors.forEach((c) => {
          c.amount = Math.round(c.amount);
        });

        return res.json(camelizeKeys(month));
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function applyDistribution(expense, contributors) {
    const distribution = getDistribution(expense, contributors);
    contributors[0].amount += distribution[0];
    contributors[1].amount += distribution[1];

    return [
      {
        id: contributors[0].id,
        name: contributors[0].name,
        amount: distribution[0],
      },
      {
        id: contributors[1].id,
        name: contributors[1].name,
        amount: distribution[1],
      },
    ];
  }

  function getDistribution(expense, contributors) {
    //Commun
    if (
      expense.DistributionTypeId.toLowerCase() ==
      "45468814-60a8-4497-ab44-1c9914d5a50d"
    ) {
      return contributors.map((c) => {
        return Number(
          (c.percentage * expense.AmountHistory[0].Amount).toFixed(1)
        );
      });
    }
    //Commun Payé par Julien
    else if (
      expense.DistributionTypeId.toLowerCase() ==
      "9df22180-3afd-4f3e-9224-b89181f49dd6"
    ) {
      const amountToRemove = (
        contributors[1].percentage * expense.AmountHistory[0].Amount
      ).toFixed(2);
      return [Number(-1 * amountToRemove), Number(amountToRemove)];
    }
    //Commun payé par Stéphanie
    else if (
      expense.DistributionTypeId.toLowerCase() ==
      "248ff0ee-26af-4940-b79a-25796220e107"
    ) {
      const amountToRemove = (
        contributors[0].percentage * expense.AmountHistory[0].Amount
      ).toFixed(2);
      return [Number(amountToRemove), Number(-1 * amountToRemove)];
    }
    //Dette de Julien au compte
    else if (
      expense.DistributionTypeId.toLowerCase() ==
      "a413ea54-9a0a-49d8-84c1-314c7ec0675f"
    ) {
      return [Number(expense.AmountHistory[0].Amount), Number(0)];
    }
    //Dette de Julien à Stéphanie
    else if (
      expense.DistributionTypeId.toLowerCase() ==
      "f62da8e0-ecb8-426c-b708-1d1897f1d99d"
    ) {
      return [
        Number(expense.AmountHistory[0].Amount),
        Number(-1 * expense.AmountHistory[0].Amount),
      ];
    }
    //Dette de Stéphanie à Julien
    else if (
      expense.DistributionTypeId.toLowerCase() ==
      "cba1674a-430b-4aef-9572-525de3ea306d"
    ) {
      return [
        Number(-1 * expense.AmountHistory[0].Amount),
        Number(expense.AmountHistory[0].Amount),
      ];
    }
    //"Dette de Stéphanie au compte
    else if (
      expense.DistributionTypeId.toLowerCase() ==
      "f910a94b-1c19-4e82-9f4e-afd445ef5044"
    ) {
      return [Number(0), Number(expense.AmountHistory[0].Amount)];
    }
  }

  return { post, get, getOne };
}

module.exports = monthController;
