const { v4: uuidv4 } = require("uuid");
const camelizeKeys = require("../services/coreService");

require("mssql");

function categoryController() {
  function get(req, res) {
    (async function getCategories() {
      try {
        const results = await req.app.locals.db.query(
          "select * from Categories order by name"
        );
        return res.send(camelizeKeys(results.recordset));
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function post(req, res) {
    (async function InsertCategory() {
      try {
        //Validate
        const results = await req.app.locals.db.query(
          `select * from Categories where name='${req.body.name}'`
        );
        if (results.rowsAffected[0] === 0) {
          const id = uuidv4();
          await req.app.locals.db.query(
            `INSERT INTO Categories (Id,Name) VALUES ('${id}','${req.body.name}')`
          );
          const results = await req.app.locals.db.query(
            `select * from Categories where id='${id}'`
          );
          res.status(201);
          return res.send(camelizeKeys(results.recordset[0]));
        } else {
          res.status(400);
          return res.send("Name is already used");
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function getCategoryMiddleware(req, res, next) {
    (async function getCategory() {
      try {
        const results = await req.app.locals.db.query(
          `select * from Categories where id='${req.params.id}'`
        );

        if (results.recordset) {
          req.category = results.recordset[0];
          return next();
        } else {
          return res.sendStatus(404);
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  function getOne(req, res) {
    return res.json(camelizeKeys(req.category));
  }

  function put(req, res) {
    (async function UpdateCategory() {
      try {
        //Validate
        const results = await req.app.locals.db.query(
          `select * from Categories where name='${req.body.name}' and id <> '${req.params.id}'`
        );

        if (results.rowsAffected[0] === 0) {
          await req.app.locals.db.query(
            `UPDATE Categories SET Name='${req.body.name}' WHERE id='${req.params.id}'`
          );
          const results = await req.app.locals.db.query(
            `select * from Categories where id='${req.params.id}'`
          );
          return res.send(camelizeKeys(results.recordset[0]));
        } else {
          res.status(400);
          return res.send("Name is already used");
        }
      } catch (error) {
        return res.send(error.stack);
      }
    })();
  }

  return { post, get, getOne, put, getCategoryMiddleware };
}

module.exports = categoryController;
