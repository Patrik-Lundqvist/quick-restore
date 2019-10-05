const path = require('path');
const { Storage } = require('@google-cloud/storage');

class GCSClient {
  constructor (config, baseDir) {
    this.config = config;
    this.GCS = new Storage({
      keyFilename: path.join(baseDir, this.config.connection.keyFilePath)
    });
  }

  downloadFile (key, filePath) {
    return new Promise((resolve, reject) => {
      const options = {
        destination: filePath
      };

      this.GCS
        .bucket(this.config.connection.bucket)
        .file(key)
        .download(options,
          (err, data) => {
            if (!err) {
              resolve(data);
            } else {
              reject(err);
            }
          });
    });
  }

  listObjects (prefix) {
    return new Promise((resolve, reject) => {
      const options = {
        prefix: prefix
      };

      this.GCS.bucket(this.config.connection.bucket)
        .getFiles(options,
          (err, data) => {
            if (!err) {
              resolve(data);
            } else {
              reject(err);
            }
          });
    });
  }
}

module.exports = GCSClient;
