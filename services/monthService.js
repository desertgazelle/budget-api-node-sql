const moment = require("moment");
const camelizeKeys = require("../services/coreService");
require("mssql");

function monthService(sql) {
  function getLastSavedMonth() {
    (async function getLastSavedMontId() {
      try {
        const results = await sql.query(
          `SELECT * FROM Months ORDER BY id DESC`
        );

        const lastMonth = results.recordset ? results.recordset[0] : undefined;
        return lastMonth ? moment.utc(lastMonth.Id) : moment.utc().date(1);
      } catch (error) {
        throw error.stack;
      }
    })();
  }

  return { getLastSavedMonth };
}

module.exports = monthService;
