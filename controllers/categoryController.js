const { v4: uuidv4 } = require("uuid");
const camelizeKeys = require("../services/coreService");

require("mssql");

function categoryController() {
  async function get(req, res) {
    req.app.locals.db
      .query("select * from Categories order by name")
      .then((results) => {
        return res.send(camelizeKeys(results.recordset));
      })
      .catch((error) => {
        return res.send(error.stack);
      });
  }

  async function post(req, res) {
    if (!req.body.name) {
      res.status(400);
      return res.send("Name is required");
    }
    req.app.locals.db
      .query(`select * from Categories where name='${req.body.name}'`)
      .then((results) => {
        if (results.rowsAffected[0] === 0) {
          console.log("validation ok");
          const id = uuidv4();
          req.app.locals.db
            .query(
              `INSERT INTO Categories (Id,Name) VALUES ('${id}','${req.body.name}');select * from Categories where id='${id}'`
            )
            .then((selectResults) => {
              res.status(201);
              return res.send(camelizeKeys(selectResults.recordset[0]));
            })
            .catch((error) => {
              return res.send(error.stack);
            });
        } else {
          res.status(400);
          return res.send("Name is already used");
        }
      })
      .catch((error) => {
        return res.send(error.stack);
      });
  }

  async function getCategoryMiddleware(req, res, next) {
    req.app.locals.db
      .query(`select * from Categories where id='${req.params.id}'`)
      .then((results) => {
        if (results.rowsAffected[0] > 0) {
          req.category = results.recordset[0];
          return next();
        } else {
          return res.sendStatus(404);
        }
      })
      .catch((error) => {
        return res.send(error.stack);
      });
  }

  async function getOne(req, res) {
    return res.json(camelizeKeys(req.category));
  }

  async function put(req, res) {
    if (!req.body.name) {
      res.status(400);
      return res.send("Name is required");
    }
    req.app.locals.db
      .query(
        `select * from Categories where name='${req.body.name}' and id <> '${req.params.id}'`
      )
      .then((results) => {
        if (results.rowsAffected[0] === 0) {
          req.app.locals.db
            .query(
              `UPDATE Categories SET Name='${req.body.name}' WHERE id='${req.params.id}';select * from Categories where id='${req.params.id}'`
            )
            .then((selectResults) => {
              return res.send(camelizeKeys(selectResults.recordset[0]));
            });
        } else {
          res.status(400);
          return res.send("Name is already used");
        }
      })
      .catch((error) => {
        return res.send(error.stack);
      });
  }

  return { post, get, getOne, put, getCategoryMiddleware };
}

module.exports = categoryController;
