const sinon = require("sinon");
const expect = require("chai").expect;
const categoryController = require("../../controllers/categoryController")();

describe("categoryController", () => {
  describe("Post", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should not insert a category without name", () => {
      //arrange
      const req = {
        body: {
          name: undefined,
        },
      };

      const res = {
        send: sinon.spy(),
        status: sinon.spy(),
      };

      //act
      categoryController.post(req, res);

      //assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(
        res.send.calledWith("Name is required"),
        `Bad status ${res.status.args[0]}`
      ).to.be.true;
    });

    it("should not insert a category with a name already used", () => {
      //arrange
      const req = {
        body: {
          name: "OneName",
        },
        app: {
          locals: {
            db: {
              query: sinon.stub().resolves({ rowsAffected: [1] }),
            },
          },
        },
      };

      const res = {
        send: sinon.spy(),
        status: sinon.spy(),
      };

      //act
      return categoryController.post(req, res).then(() => {
        //assert
        expect(res.status.calledWith(400), `Bad status`).to.be.true;
        expect(
          res.send.calledWith("Name is already used"),
          `Bad status message`
        ).to.be.true;
      });
    });

    it.skip("should insert a category and return it", () => {
      //arrange
      const queryStub = sinon.stub();
      queryStub.onCall(0).resolves({ rowsAffected: [0] });
      queryStub
        .onCall(1)
        .resolves({ recordset: [{ Id: "Guid", Name: "OneName" }] });
      const req = {
        body: {
          name: "OneName",
        },
        app: {
          locals: {
            db: {
              query: queryStub,
            },
          },
        },
      };

      const res = {
        send: sinon.spy(),
        status: sinon.spy(),
      };

      //act
      return categoryController.post(req, res).then(() => {
        //assert
        expect(
          res.status.calledWith(201),
          `Bad status ${
            res.status.args && res.status.args[0]
              ? res.status.args[0][0]
              : undefined
          }`
        ).to.be.true;
        // expect(
        //   res.send.calledWith("Name is already used"),
        //   `Bad status message`
        // ).to.be.true;
      });
    });
  });

  describe("Put", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should not update a category with a name already used", () => {
      //arrange
      const req = {
        params: {
          id: "GUID",
        },
        body: {
          name: "OneName",
        },
        app: {
          locals: {
            db: {
              query: sinon.stub().resolves({ rowsAffected: [1] }),
            },
          },
        },
      };

      const res = {
        send: sinon.spy(),
        status: sinon.spy(),
      };

      //act
      return categoryController.put(req, res).then(() => {
        //assert
        expect(res.status.calledWith(400)).to.be.true;
        expect(res.send.calledWith("Name is already used")).to.be.true;
      });
    });

    it("should not update a category without name", () => {
      //arrange
      const req = {
        body: {
          name: undefined,
        },
      };

      const res = {
        send: sinon.spy(),
        status: sinon.spy(),
      };

      //act
      categoryController.put(req, res);

      //assert
      expect(res.status.calledWith(400), `Bad status ${res.status.args[0][0]}`)
        .to.be.true;
      expect(
        res.send.calledWith("Name is required"),
        `Bad status message ${res.status.args[0][0]}`
      ).to.be.true;
    });
  });

  describe("Get", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should return the list of categories", () => {
      //arrange
      const categories = [{ id: "Guid", name: "OneName" }];
      const req = {
        app: {
          locals: {
            db: {
              query: sinon
                .stub()
                .resolves({ recordset: [{ Id: "Guid", Name: "OneName" }] }),
            },
          },
        },
      };

      const res = {
        send: sinon.spy(),
      };

      //act
      return categoryController.get(req, res).then(() => {
        //assert
        expect(res.send.called).to.be.true;
        expect(res.send.args[0][0]).to.be.eql(categories);
      });
    });

    it.skip("should throw an error", () => {
      //arrange
      const req = {
        app: {
          locals: {
            db: {
              query: sinon.stub().resolves(),
            },
          },
        },
      };

      const res = {
        send: sinon.spy(),
      };

      //act
      return categoryController.get(req, res).then(() => {
        //assert
        expect(res.send.called).to.be.true;
        expect(res.send.args[0][0]).to.contains("TypeError");
      });
    });
  });

  describe("GetOne", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should return a category when exists", () => {
      //arrange
      const category = { id: "Guid", name: "OneName" };
      const req = {
        category,
        app: {
          params: {
            id: "GUID",
          },
          locals: {
            db: {
              query: sinon
                .stub()
                .resolves({ recordset: [{ Id: "Guid", Name: "OneName" }] }),
            },
          },
        },
      };

      const res = {
        json: sinon.spy(),
      };

      //act
      return categoryController.getOne(req, res).then(() => {
        //assert
        expect(res.json.called).to.be.true;
        expect(res.json.args[0][0]).to.be.eql(category);
      });
    });
  });

  describe("getCategoryMiddleware", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should return a category when exists", () => {
      //arrange
      const category = { Id: "Guid", Name: "OneName" };
      const req = {
        params: {
          id: "GUID",
        },
        app: {
          locals: {
            db: {
              query: sinon
                .stub()
                .resolves({ rowsAffected: [1], recordset: [category] }),
            },
          },
        },
      };

      const res = {};

      const next = sinon.spy();

      //act
      return categoryController
        .getCategoryMiddleware(req, res, next)
        .then(() => {
          //assert
          expect(next.called).to.be.true;
          expect(req.category).to.be.eql(category);
        });
    });

    it("should return status 404 when category does not exist", () => {
      //arrange
      const req = {
        params: {
          id: "GUID",
        },
        app: {
          locals: {
            db: {
              query: sinon.stub().resolves({ rowsAffected: [0] }),
            },
          },
        },
      };

      const res = {
        sendStatus: sinon.spy(),
      };

      const next = sinon.spy();

      //act
      return categoryController
        .getCategoryMiddleware(req, res, next)
        .then(() => {
          //assert
          expect(next.notCalled).to.be.true;
          expect(res.sendStatus.calledWith(404), `Bad status`).to.be.true;
        });
    });

    it.skip("should throw an error", () => {
      //arrange
      const error = new Error();
      error.stack = "stack";
      const req = {
        params: {
          id: "GUID",
        },
        app: {
          locals: {
            db: {
              query: sinon.stub().resolves(),
            },
          },
        },
      };

      const res = {
        send: sinon.spy(),
      };

      const next = sinon.spy();

      //act
      return categoryController
        .getCategoryMiddleware(req, res, next)
        .then(() => {
          //assert
          expect(res.send.called).to.be.true;
          expect(res.send.args[0][0]).to.contains("TypeError");
        });
    });
  });
});
