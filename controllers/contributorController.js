require("mssql");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const camelizeKeys = require("../services/coreService");
const validAmountService = require("../services/validAmountService")();

function contributorController() {
  function get(req, res) {
    (async function getContributors() {
      try {
        const results = await req.app.locals.db.query(
          `SELECT c.Id, c.Name, c.Rank, t.ValidAmountId, t.Amount, t.EndDate, t.StartDate
FROM Contributors AS c
LEFT JOIN (
    SELECT c0.ContributorId, c0.ValidAmountId, v.Amount, v.EndDate, v.StartDate
    FROM ContributorValidAmounts AS c0
    INNER JOIN ValidAmounts AS v ON c0.ValidAmountId = v.Id
) AS t ON c.Id = t.ContributorId
ORDER BY c.Rank, c.Id, t.StartDate DESC, t.ValidAmountId`
        );

        const contributors = await formatContributors(
          results.recordset,
          req.app.locals.db
        );
        return res.json(camelizeKeys(contributors));
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  async function formatContributors(results, sql) {
    const contributors = [];
    results.forEach((result) => {
      let contributor = contributors.find((c) => c.Id == result.Id);
      if (contributor === undefined) {
        contributor = {
          Id: result.Id,
          Name: result.Name,
          Rank: result.Rank,
          SalaryHistory: [],
        };
        contributors.push(contributor);
      }
      const salary = validAmountService.formatValidAmount(result, sql);
      contributor.SalaryHistory.push(salary);
    });
    return contributors;
  }

  function getContributorMiddleware(req, res, next) {
    (async function getContributorRaw() {
      try {
        const contributor = await getOneContributorRaw(
          req.params.contributorId,
          req.app.locals.db
        );

        if (contributor) {
          req.contributor = contributor;
          return next();
        } else {
          return res.sendStatus(404);
        }
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  async function getOneContributorRaw(contributorId, sql) {
    try {
      const results = await sql.query(
        `SELECT c.Id, c.Name, c.Rank, t.ValidAmountId, t.Amount, t.EndDate, t.StartDate
FROM Contributors AS c
LEFT JOIN (
    SELECT c0.ContributorId, c0.ValidAmountId, v.Amount, v.EndDate, v.StartDate
    FROM ContributorValidAmounts AS c0
    INNER JOIN ValidAmounts AS v ON c0.ValidAmountId = v.Id
) AS t ON c.Id = t.ContributorId
WHERE c.Id='${contributorId}'
ORDER BY c.Rank, c.Id, t.StartDate DESC, t.ValidAmountId`
      );

      if (results.rowsAffected[0] > 0) {
        const contributors = await formatContributors(results.recordset, sql);
        return contributors[0];
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  async function getContributorsRaw(sql, monthId) {
    try {
      const results = await sql.query(
        `SELECT c.Id, c.Name, c.Rank, t.ValidAmountId, t.Amount, t.EndDate, t.StartDate
FROM Contributors AS c
LEFT JOIN (
    SELECT c0.ContributorId, c0.ValidAmountId, v.Amount, v.EndDate, v.StartDate
    FROM ContributorValidAmounts AS c0
    INNER JOIN ValidAmounts AS v ON c0.ValidAmountId = v.Id
    WHERE v.StartDate <= '${monthId}' AND (v.EndDate is NULL OR (v.EndDate is not NULL AND v.EndDate >= '${monthId}'))    
) AS t ON c.Id = t.ContributorId
ORDER BY c.Rank, c.Id, t.StartDate DESC, t.ValidAmountId`
      );

      if (results.rowsAffected[0] > 0) {
        const contributors = await formatContributors(results.recordset, sql);
        return contributors;
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  function getSalaryMiddleware(req, res, next) {
    const salary = req.contributor.SalaryHistory.find(
      (s) => s.Id == req.params.salaryId
    );
    if (salary) {
      req.Salary = salary;
      return next();
    } else {
      return res.sendStatus(404);
    }
  }

  async function getContributor(req, res) {
    return res.json(camelizeKeys(req.contributor));
  }

  function getOne(req, res) {
    return getContributor(req, res);
  }

  function put(req, res) {
    (async function UpdateContributor() {
      try {
        //Validate
        const results = await req.app.locals.db.query(
          `select * from Contributors where name='${req.body.name}' and id <> '${req.params.contributorId}'`
        );

        if (results.rowsAffected[0] === 0) {
          await req.app.locals.db.query(
            `UPDATE Contributors SET Name='${req.body.name}' WHERE id='${req.params.contributorId}'`
          );

          const contributor = await getOneContributorRaw(
            req.params.contributorId,
            req.app.locals.db
          );
          return res.json(camelizeKeys(contributor));
        } else {
          res.status(400);
          return res.send("Name is already used");
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function postSalary(req, res) {
    (async function InsertSalary() {
      try {
        //Validation
        err = await validAmountService.isValid(
          req.body,
          req.contributor.SalaryHistory,
          req.app.locals.db
        );
        if (err) {
          res.status(400);
          return res.send(err);
        }
        const lastValidAmount = validAmountService.getLastValidAmount(
          req.contributor.SalaryHistory
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
INSERT INTO ContributorValidAmounts (ContributorId, ValidAmountId)
VALUES ('${req.params.contributorId}', '${id}')`
            : `INSERT INTO ValidAmounts (Id, Amount, StartDate) VALUES
('${id}', ${req.body.amount}, '${startDate}');
INSERT INTO ContributorValidAmounts (ContributorId, ValidAmountId)
VALUES ('${req.params.contributorId}', '${id}')`
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
        return getSalaries(req, res);
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  function getSalaries(req, res) {
    (async function getContributorSalaries() {
      try {
        const results = await req.app.locals.db.query(
          `SELECT c0.ContributorId, c0.ValidAmountId, v.Amount, v.EndDate, v.StartDate
FROM ContributorValidAmounts AS c0
INNER JOIN ValidAmounts AS v ON c0.ValidAmountId = v.Id
WHERE c0.ContributorId = '${req.params.contributorId}'
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

  async function getOneSalary(req, res) {
    try {
      const results = await req.app.locals.db.query(
        `SELECT c0.ContributorId, c0.ValidAmountId, v.Amount, v.EndDate, v.StartDate
FROM ContributorValidAmounts AS c0
INNER JOIN ValidAmounts AS v ON c0.ValidAmountId = v.Id
WHERE c0.ContributorId = '${req.params.contributorId}' and c0.ValidAmountId = '${req.params.salaryId}'
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

  function getSalary(req, res) {
    return getOneSalary(req, res);
  }

  function putSalary(req, res) {
    (async function UpdateSalary() {
      try {
        //Validation
        req.body.Id = req.params.salaryId;
        err = await validAmountService.isValid(
          req.body,
          req.contributor.SalaryHistory,
          req.app.locals.db,
          true
        );
        if (err) {
          res.status(400);
          return res.send(err);
        }
        const lastValidAmount = validAmountService.getLastValidAmount(
          req.contributor.SalaryHistory,
          req.params.salaryId
        );

        //Mise à jour du montant
        const startDate = moment(req.body.startDate)
          .format("YYYY-MM-DD")
          .toString();
        const endDate = req.body.endDate
          ? moment(req.body.endDate).format("YYYY-MM-DD").toString()
          : null;
        await req.app.locals.db.query(
          endDate
            ? `UPDATE ValidAmounts SET Amount='${req.body.amount}', StartDate='${startDate}', EndDate='${endDate}' WHERE id='${req.params.salaryId}'`
            : `UPDATE ValidAmounts SET Amount='${req.body.amount}', StartDate='${startDate}', EndDate=NULL WHERE id='${req.params.salaryId}'`
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
        return getSalaries(req, res);
      } catch (error) {
        res.send(error.stack);
      }
    })();
  }

  return {
    getOne,
    get,
    put,
    postSalary,
    getSalaries,
    getSalary,
    putSalary,
    getContributorMiddleware,
    getSalaryMiddleware,
    getContributorsRaw,
  };
}

module.exports = contributorController;
