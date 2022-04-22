const sinon = require("sinon");
const expect = require("chai").expect;
const distributionTypeController =
  require("../../controllers/distributionTypeController")();

describe("distributionTypeController", () => {
  describe("get", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should return the list of distribution types", () => {
      //arrange
      const distributionTypes = [{ id: "Guid", name: "OneName" }];
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
        json: sinon.spy(),
      };

      //act
      return distributionTypeController.get(req, res).then(() => {
        //assert
        expect(res.json.called).to.be.true;
        expect(res.json.args[0][0]).to.be.eql(distributionTypes);
      });
    });

    it("should throw an error", () => {
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
      return distributionTypeController.get(req, res).then(() => {
        //assert
        expect(res.send.called).to.be.true;
        expect(res.send.args[0][0]).to.contains("TypeError");
      });
    });
  });

  describe("getOne", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should return a distribution type when exists", () => {
      //arrange
      const distributionType = { id: "Guid", name: "OneName" };
      const req = {
        params: {
          id: "GUID",
        },
        app: {
          locals: {
            db: {
              query: sinon.stub().resolves({
                rowsAffected: [1],
                recordset: [{ Id: "Guid", Name: "OneName" }],
              }),
            },
          },
        },
      };

      const res = {
        json: sinon.spy(),
      };

      //act
      return distributionTypeController.getOne(req, res).then(() => {
        //assert
        expect(res.json.called).to.be.true;
        expect(res.json.args[0][0]).to.be.eql(distributionType);
      });
    });

    it("should return status 404 when distribution type does not exist", () => {
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

      //act
      return distributionTypeController.getOne(req, res).then(() => {
        //assert
        expect(res.sendStatus.calledWith(404), `Bad status`).to.be.true;
      });
    });

    it("should throw an error", () => {
      //arrange
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

      //act
      return distributionTypeController.getOne(req, res).then(() => {
        //assert
        expect(res.send.called).to.be.true;
        expect(res.send.args[0][0]).to.contains("TypeError");
      });
    });
  });
});
