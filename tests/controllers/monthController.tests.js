const sinon = require("sinon");
const expect = require("chai").expect;
const moment = require("moment");
const monthController = require("../../controllers/monthController")();

describe("monthController", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("post", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should not insert a month without id", () => {
      //arrange
      const req = {
        body: {
          id: undefined,
        },
      };

      const res = {
        send: sinon.spy(),
        status: sinon.spy(),
      };

      //act
      monthController.post(req, res);

      //assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(
        res.send.calledWith("Id is required"),
        `Bad status ${res.status.args[0]}`
      ).to.be.true;
    });

    it("should not insert a month already inserted", () => {
      //arrange
      const req = {
        body: {
          id: "Id",
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
      return monthController.post(req, res).then(() => {
        //assert
        expect(res.status.calledWith(400), `Bad status`).to.be.true;
        expect(
          res.send.calledWith("Month already exists."),
          `Bad status message`
        ).to.be.true;
      });
    });

    it.skip("should insert a month and return it", () => {
      //arrange
      const now = moment.utc();
      const queryStub = sinon.stub();
      queryStub.onCall(0).resolves({ rowsAffected: [0] });
      queryStub.onCall(1).resolves({ recordset: [{ Id: now.toString() }] });
      const req = {
        body: {
          id: now.format("YYYY-MM-DD").toString(),
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
      return monthController.post(req, res).then(() => {
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

    it("should throw an error", () => {
      //arrange
      const req = {
        app: {
          locals: {
            db: {},
          },
        },
      };

      const res = {
        send: sinon.spy(),
      };

      //act
      return monthController.post(req, res).then(() => {
        //assert
        expect(res.send.called).to.be.true;
        expect(res.send.args[0][0]).to.contains("TypeError");
      });
    });
  });

  describe("get", () => {
    it("should return the list of months", () => {
      //arrange
      const now = moment.utc();
      const months = [
        {
          id: now.format("YYYY-MM-DD").toString(),
          name: now.format("YYYY MMM").toString(),
          canEdit: false,
        },
      ];
      const req = {
        app: {
          locals: {
            db: {
              query: sinon
                .stub()
                .resolves({ recordset: [{ Id: now.format().toString() }] }),
            },
          },
        },
      };

      const res = {
        json: sinon.spy(),
      };

      //act
      return monthController.get(req, res).then(() => {
        //assert
        expect(res.json.called).to.be.true;
        expect(res.json.args[0][0]).to.be.eql(months);
      });
    });

    it("should throw an error", () => {
      //arrange
      const req = {
        app: {
          locals: {
            db: {},
          },
        },
      };

      const res = {
        send: sinon.spy(),
      };

      //act
      return monthController.get(req, res).then(() => {
        //assert
        expect(res.send.called).to.be.true;
        expect(res.send.args[0][0]).to.contains("TypeError");
      });
    });
  });
});
