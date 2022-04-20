const moment = require("moment");
const monthService = require("./monthService");

function validAmountService() {
  function isValid(validAmount, history, sql, update = false) {
    if (validAmount) {
      const lastMonth = getLastSavedMonth(sql);
      const validAmountStartDate = moment(validAmount.startDate);
      const validAmountEndDate = moment(validAmount.endDate);
      let originalValidAmount = null;

      if (history.length > 0) {
        originalValidAmount = history.find((s) => s.Id == validAmount.Id);
        const filteredHistory = !update
          ? history.filter((s) => s.Id != validAmount.Id)
          : history;

        if (filteredHistory.length > 0) {
          const firstValidAmount = history[history.length];
          const lastValidAmount = history[0];

          if (
            firstValidAmount &&
            validAmountStartDate <= firstValidAmount.StartDate
          ) {
            return "La date de début de validité est plus petite que la date de début de sébut de l'historique !";
          }

          if (
            (firstValidAmount &&
              validAmountStartDate <= firstValidAmount.StartDate) ||
            (lastValidAmount &&
              (validAmountStartDate < lastValidAmount.StartDate ||
                (lastValidAmount.EndDate &&
                  validAmountStartDate < lastValidAmount.EndDate)))
          ) {
            return "L'intervalle de validité de ce montant chevauche celui de l'historique !";
          }
        }
      }

      const canEditStartDate =
        !update || originalValidAmount.StartDate > lastMonth;

      if (
        !canEditStartDate &&
        originalValidAmount.Amount != validAmount.Amount
      ) {
        return "La valeur du montant ne peut être modifiée sans affecter l'historique du budget !";
      }

      const canEditEndDate =
        !update ||
        !originalValidAmount.EndDate ||
        originalValidAmount.EndDate > lastMonth;

      let isBudgetHistoryAffected =
        !update && validAmountStartDate <= lastMonth;

      isBudgetHistoryAffected =
        isBudgetHistoryAffected ||
        (!canEditStartDate &&
          originalValidAmount.StartDate != validAmountStartDate) ||
        (!canEditEndDate && originalValidAmount.EndDate != validAmountEndDate);
      isBudgetHistoryAffected =
        isBudgetHistoryAffected ||
        (canEditStartDate && validAmountStartDate <= lastMonth) ||
        (canEditEndDate &&
          validAmountEndDate &&
          validAmountEndDate < lastMonth);

      if (isBudgetHistoryAffected) {
        return "L'intervalle de validité de ce montant affecte l'historique du budget !";
      }
    }
    return "";
  }

  function getLastValidAmount(history, validAmountIdToExclude = null) {
    if (history && history.length > 0) {
      const orderedHistory = history.filter(
        (s) => s.Id != validAmountIdToExclude
      );
      return orderedHistory.length > 0 && !orderedHistory[0].EndDate
        ? orderedHistory[0]
        : null;
    }
    return null;
  }

  function formatValidAmount(validAmount, sql) {
    const lastMonth = getLastSavedMonth(sql);
    const startDate = moment.utc(validAmount.StartDate);
    const endDate = validAmount.EndDate
      ? moment.utc(validAmount.EndDate)
      : null;
    return {
      Id: validAmount.ValidAmountId,
      Amount: validAmount.Amount,
      StartDate: startDate,
      EndDate: endDate,
      CanEditAmount: startDate > lastMonth,
      CanEditStartDate: startDate > lastMonth,
      CanEditEndDate: !endDate || endDate > lastMonth,
    };
  }

  function formatValidAmountHistory(results, sql) {
    const lastMonth = getLastSavedMonth(sql);

    return results.map((result) => {
      return formatValidAmount(result, sql);
    });
  }

  function GetMonthAmount(history, monthId) {
    if (history && history.length > 0) {
      amount = history.find(
        (a) =>
          a.StartDate <= monthId &&
          (!a.EndDate || (a.EndDate && a.EndDate >= monthId))
      );
      return amount ? amount.Amount : 0;
    }
    return 0;
  }

  function getLastSavedMonth(sql) {
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

  return {
    isValid,
    getLastValidAmount,
    formatValidAmount,
    formatValidAmountHistory,
    GetMonthAmount,
  };
}

module.exports = validAmountService;
