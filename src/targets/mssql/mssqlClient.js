const Connection = require('tedious').Connection;
const Request = require('tedious').Request;

class MssqlClient {
  constructor (config) {
    this.config = config;
  }

  init () {
    return new Promise((resolve, reject) => {
      this.connection = new Connection({
        userName: this.config.username,
        password: this.config.password,
        server: this.config.server,
        options: {
          rowCollectionOnRequestCompletion: true
        }
      });
      this.connection.on('connect', err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      this.connection.on('error', () => {});
    });
  }

  executeSql (sqlStatement) {
    return new Promise((resolve, reject) => {
      this.connection.execSql(
        new Request(
          sqlStatement,
          (err, rowCount, rows) =>
            (!err ? resolve({ rowCount, rows }) : reject(err))
        )
      );
    });
  }

  resetConnection () {
    return new Promise((resolve, reject) => {
      this.connection.reset(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close () {
    this.connection.close();
  }
}

module.exports = MssqlClient;
