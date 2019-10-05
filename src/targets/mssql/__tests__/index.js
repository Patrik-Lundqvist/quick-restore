const MssqlDriver = require('../index');
const path = require('path');
const config = require('./__fixtures__/mssql.json');
const MssqlClient = require('../mssqlClient');

const testFile = path.join(
  __dirname,
  `./__fixtures__/${config.connection.database}.bak`
);
const basePath = path.join(__dirname, './__fixtures__');
const timeout = 20000;

describe('mssql tests', function () {
  it('restores db', async () => {
    const mssqlClient = new MssqlClient(config.connection);
    const mssqlTarget = new MssqlDriver(config, basePath);

    await mssqlTarget.restore(testFile);

    await mssqlClient.init();
    const dbExistsResult = await mssqlClient.executeSql(
      `select * from sys.databases
       where name = '${config.connection.database}'`
    );
    mssqlClient.close();

    expect(dbExistsResult.rowCount).toBe(1);
  }, timeout);

  it('overwrites existing db', async () => {
    const mssqlClient = new MssqlClient(config.connection);
    const mssqlTarget = new MssqlDriver(config, basePath);

    await mssqlTarget.restore(testFile);

    await mssqlClient.init();
    await mssqlClient.executeSql(
      `use ${config.connection.database};
       update Employees
       set FirstName='Hurley'
       where EmployeeID = 1`
    );
    mssqlClient.close();

    await mssqlTarget.restore(testFile);

    await mssqlClient.init();
    const firstNameResult = await mssqlClient.executeSql(
      `use ${config.connection.database};
       select FirstName
       from Employees
       where EmployeeID = 1`
    );
    mssqlClient.close();

    expect(firstNameResult.rows[0][0].value).toBe('Nancy');
  }, timeout);

  it('restores db currently in use', async () => {
    const mssqlClient = new MssqlClient(config.connection);
    const mssqlTarget = new MssqlDriver(config, basePath);

    await mssqlTarget.restore(testFile);

    await mssqlClient.init();
    await mssqlClient.executeSql(
      `use ${config.connection.database};
       update Employees
       set FirstName='Hurley'
       where EmployeeID = 1`
    );

    await mssqlTarget.restore(testFile);

    await mssqlClient.init();
    const firstNameResult = await mssqlClient.executeSql(
      `use ${config.connection.database};
       select FirstName
       from Employees
       where EmployeeID = 1`
    );
    mssqlClient.close();

    expect(firstNameResult.rows[0][0].value).toBe('Nancy');
  }, timeout);

  it('runs sql-script', async () => {
    const mssqlClient = new MssqlClient(config.connection);
    const mssqlTarget = new MssqlDriver(config, basePath);

    await mssqlTarget.restore(testFile);

    await mssqlClient.init();
    const firstNameResult = await mssqlClient.executeSql(
      `use ${config.connection.database};
       select FirstName
       from Employees
       where EmployeeID = 2`
    );
    mssqlClient.close();

    expect(firstNameResult.rows[0][0].value).toBe('CHANGED');
  }, timeout);
});
