const Connection = require("tedious").Connection;
const Request = require("tedious").Request;

class MssqlClient {
  constructor(config) {
    this.config = config;
  }

  init(timeout = 0) {
    return new Promise((resolve, reject) => {
      this.connection = new Connection({
        server: this.config.server,
        authentication: {
          type: "default",
          options: {
            userName: this.config.username,
            password: this.config.password,
          },
        },
        options: {
          rowCollectionOnRequestCompletion: true,
          requestTimeout: timeout,
          trustServerCertificate: true,
          validateBulkLoadParameters: true,
        },
      });
      this.connection.on("connect", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      this.connection.on("error", (err) => {
        reject(err);
      });
      this.connection.connect();
    });
  }

  executeSql(sqlStatement) {
    return new Promise((resolve, reject) => {
      this.connection.execSql(
        new Request(sqlStatement, (err, rowCount, rows) =>
          !err ? resolve({ rowCount, rows }) : reject(err),
        ),
      );
    });
  }

  resetConnection() {
    return new Promise((resolve, reject) => {
      this.connection.reset((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close() {
    this.connection.close();
  }
}

module.exports = MssqlClient;
