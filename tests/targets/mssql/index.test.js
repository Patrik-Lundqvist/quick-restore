const MssqlDriver = require("../../../src/targets/mssql");
const path = require("path");
const config = require("./fixtures/mssql.json");
const MssqlClient = require("../../../src/targets/mssql/mssqlClient");
const { ConnectionError } = require("tedious");

const testFile = path.join(`/fixtures/${config.connection.database}.bak`);
const basePath = path.join(__dirname, "./fixtures");
const timeout = 20000;

const delay = (time) =>
  new Promise((resolve) => {
    setTimeout(resolve, time);
  });

const waitForConnection = async () => {
  while (true) {
    try {
      const mssqlClient = new MssqlClient(config.connection);
      await mssqlClient.init();
      mssqlClient.close();
      return;
    } catch (err) {
      if (!err instanceof ConnectionError) {
        throw err;
      }
      await delay(1000);
    }
  }
};

describe("mssql tests", function () {
  beforeAll(async () => {
    await waitForConnection();
  }, timeout);

  it(
    "restores db",
    async () => {
      const mssqlClient = new MssqlClient(config.connection);
      const mssqlTarget = new MssqlDriver(config, basePath);

      await mssqlTarget.restore(testFile);

      await mssqlClient.init();
      const dbExistsResult = await mssqlClient.executeSql(
        `select * from sys.databases
       where name = '${config.connection.database}'`,
      );
      mssqlClient.close();

      expect(dbExistsResult.rowCount).toBe(1);
    },
    timeout,
  );

  it(
    "overwrites existing db",
    async () => {
      const mssqlClient = new MssqlClient(config.connection);
      const mssqlTarget = new MssqlDriver(config, basePath);

      await mssqlTarget.restore(testFile);

      await mssqlClient.init();
      await mssqlClient.executeSql(
        `use ${config.connection.database};
       update Employees
       set FirstName='Hurley'
       where EmployeeID = 1`,
      );
      mssqlClient.close();

      await mssqlTarget.restore(testFile);

      await mssqlClient.init();
      const firstNameResult = await mssqlClient.executeSql(
        `use ${config.connection.database};
       select FirstName
       from Employees
       where EmployeeID = 1`,
      );
      mssqlClient.close();

      expect(firstNameResult.rows[0][0].value).toBe("Nancy");
    },
    timeout,
  );

  it(
    "restores db currently in use",
    async () => {
      const mssqlClient = new MssqlClient(config.connection);
      const mssqlTarget = new MssqlDriver(config, basePath);

      await mssqlTarget.restore(testFile);

      await mssqlClient.init();
      await mssqlClient.executeSql(
        `use ${config.connection.database};
       update Employees
       set FirstName='Hurley'
       where EmployeeID = 1`,
      );

      await mssqlTarget.restore(testFile);

      await mssqlClient.init();
      const firstNameResult = await mssqlClient.executeSql(
        `use ${config.connection.database};
       select FirstName
       from Employees
       where EmployeeID = 1`,
      );
      mssqlClient.close();

      expect(firstNameResult.rows[0][0].value).toBe("Nancy");
    },
    timeout,
  );

  it(
    "runs sql-script",
    async () => {
      const mssqlClient = new MssqlClient(config.connection);
      const mssqlTarget = new MssqlDriver(config, basePath);

      await mssqlTarget.restore(testFile);

      await mssqlClient.init();
      const firstNameResult = await mssqlClient.executeSql(
        `use ${config.connection.database};
       select FirstName
       from Employees
       where EmployeeID = 2`,
      );
      mssqlClient.close();

      expect(firstNameResult.rows[0][0].value).toBe("CHANGED");
    },
    timeout,
  );
});
