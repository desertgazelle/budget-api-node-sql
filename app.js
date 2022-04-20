const express = require("express");
const sql = require("mssql");
const { config } = require("./local.config");
const bodyParser = require("body-parser");
const categoryRouter = require("./routes/categoryRouter");
const distributionTypeRouter = require("./routes/distributionTypeRouter");
const monthRouter = require("./routes/monthRouter");
const contributorRouter = require("./routes/contributorRouter");
const expenseRouter = require("./routes/expenseRouter");

const app = express();
const appPool = new sql.ConnectionPool(config);

const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/categories", categoryRouter);
app.use("/distributionTypes", distributionTypeRouter);
app.use("/months", monthRouter);
app.use("/contributors", contributorRouter);
app.use("/expenses", expenseRouter);

app.get("/", (req, res) => {
  res.send("Welcome to my NOdemon api!");
});

//connect the pool and start the web server when done
appPool
  .connect()
  .then(function (pool) {
    app.locals.db = pool;
    app.server = app.listen(port, function () {
      console.log(`Listening at port ${port}`);
    });
  })
  .catch(function (err) {
    console.error("Error creating connection pool", err);
  });

module.exports = app;
