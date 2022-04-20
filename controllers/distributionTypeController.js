require("mssql");
const camelizeKeys = require("../services/coreService");

function distributionTypeController() {
  function get(req, res) {
    (async function getDistributionTypes() {
      try {
        const results = await req.app.locals.db
          .query`SELECT * FROM DistributionTypes ORDER BY name`;
        return res.json(camelizeKeys(results.recordset));
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function getOne(req, res) {
    (async function getDistributionType() {
      try {
        const results = await req.app.locals.db.query(
          `SELECT * FROM DistributionTypes WHERE id='${req.params.id}'`
        );
        if (results.rowsAffected[0] > 0) {
          return res.json(camelizeKeys(results.recordset[0]));
        } else {
          return res.sendStatus(404);
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function applyDistribution(expense, contributors) {}

  return { get, getOne, applyDistribution };
}

module.exports = distributionTypeController;
