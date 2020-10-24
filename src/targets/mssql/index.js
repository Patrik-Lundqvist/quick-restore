const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const MssqlClient = require("./mssqlClient");
const noop = require("../../utils/noop");

const readFileAsync = promisify(fs.readFile);

const baseConfig = {
  connection: {
    server: "localhost",
    username: "",
    password: "",
    database: "",
  },
  script: null,
};

class MssqlTarget {
  constructor(config, baseDir, logFn) {
    this.baseDir = baseDir;
    this.config = Object.assign({}, baseConfig, config);
    this.log = logFn || noop;
    this.sqlClient = new MssqlClient(this.config.connection);
  }

  async restore(restorePoint) {
    await this.sqlClient.init();

    try {
      await this.runRestore(restorePoint);
      await this.sqlClient.close();
    } catch (err) {
      await this.sqlClient.close();
      throw err;
    }
  }

  async runRestore(restorePoint) {
    const dbExists = await this.databaseExists(this.config.connection.database);
    if (dbExists) {
      await this.closeConnections(this.config.connection.database);
    }

    const targetLocation = await this.getDefaultDataLocation();
    const backupFiles = await this.getFilesFromBackup(restorePoint);
    await this.restoreDatabase(
      this.config.connection.database,
      restorePoint,
      targetLocation,
      backupFiles,
    );
    await this.sqlClient.resetConnection();
    await this.runScript();
  }

  restoreDatabase(database, restorePoint, newLocation, files) {
    const bakupBasename = path.basename(restorePoint);
    this.log(`Restoring database [${bakupBasename}]`);
    const getNewFileLocation = (file, newLocation) =>
      `${newLocation}\\${path.basename(file.physicalName)}`;

    const moveStatements = files.map(
      (f) =>
        `move '${f.logicalName}' to '${getNewFileLocation(f, newLocation)}'`,
    );

    const restoreDb = `
      restore database ${database}
      from disk = '${restorePoint}'
      with replace,
      ${moveStatements};
    `;

    return this.sqlClient.executeSql(restoreDb);
  }

  async databaseExists(database) {
    const selectDb = `
      select *
      from sys.databases
      where [name] = '${database}';
    `;
    const dbs = await this.sqlClient.executeSql(selectDb);
    return !!dbs.rowCount;
  }

  async closeConnections(database) {
    const setDbOffline = `
      alter database ${database}
      set offline
      with rollback immediate;
    `;
    const setDbOnline = `
      alter database ${database}
      set online;
    `;
    await this.sqlClient.executeSql(setDbOffline);
    await this.sqlClient.executeSql(setDbOnline);
  }

  async getFilesFromBackup(restorePoint) {
    const selectFileList = `
      restore filelistonly
      from disk = '${restorePoint}';
    `;

    const fileList = await this.sqlClient.executeSql(selectFileList);
    return fileList.rows.map((fileProps) => {
      const logicalName = fileProps.find(
        (prop) => prop.metadata.colName === "LogicalName",
      ).value;
      const physicalName = fileProps.find(
        (prop) => prop.metadata.colName === "PhysicalName",
      ).value;

      return { logicalName, physicalName };
    });
  }

  async getDefaultDataLocation() {
    const selectMasterLocation = `
      select physical_name
      from master.sys.master_files
      where database_id = 1
      and FILE_ID = 1
    `;

    const masterFileLocation = await this.sqlClient.executeSql(
      selectMasterLocation,
    );
    return path.dirname(masterFileLocation.rows[0][0].value);
  }

  async readScript(scriptPath) {
    try {
      return await readFileAsync(scriptPath, {
        encoding: "utf8",
      });
    } catch (err) {
      throw new Error(`Could not load sql script file at ${scriptPath}`);
    }
  }

  async runScript() {
    const scriptPath = this.config.script;
    if (!scriptPath) {
      return;
    }
    const script = await this.readScript(path.join(this.baseDir, scriptPath));
    this.log("Running script");
    await this.sqlClient.executeSql(
      `use ${this.config.connection.database}; ${script}`,
    );
  }
}

module.exports = MssqlTarget;
