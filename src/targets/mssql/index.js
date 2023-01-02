const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const MssqlClient = require("./mssqlClient");
const noop = require("../../utils/noop");
const crypto = require("crypto");

const readFileAsync = promisify(fs.readFile);

const baseConfig = {
  connection: {
    server: "localhost",
    instanceName: null,
    port: null,
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
      await this.closeExternalConnections(this.config.connection.database);
    }

    await this.restoreDatabase(
      this.config.connection.database,
      restorePoint,
      dbExists,
    );
    await this.sqlClient.resetConnection();
    await this.runScript();
  }

  async restoreDatabase(database, restorePoint, dbExists) {
    const backupName = path.basename(restorePoint);
    this.log(`Restoring database [${backupName}]`);

    let restoreDb = `
      restore database ${database}
      from disk = '${restorePoint}'
      with replace
    `;

    // Specify physical locations only for new databases using move statements
    if (!dbExists) {
      const targetFolder = await this.getDefaultDataLocation();
      const files = await this.getFilesFromBackup(restorePoint);
      const moveStatements = files.map(
        (file) => `
          move 
            '${file.logicalName}'
          to
            '${path.resolve(targetFolder, this.generatePhysicalName(file))}'
        `,
      );

      restoreDb += `,${moveStatements}`;
    }

    await this.sqlClient.executeSql(restoreDb);
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

  async closeExternalConnections(database) {
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

  generatePhysicalName(file) {
    const logicalName = file.logicalName;
    const uuid = crypto.randomUUID();
    const fileExtension = path.extname(file.physicalName);
    return `${logicalName}_${uuid}${fileExtension}`;
  }
}

module.exports = MssqlTarget;
