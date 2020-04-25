const path = require("path");
const { Storage } = require("@google-cloud/storage");

class GCSClient {
  constructor(config, baseDir) {
    this.config = config;
    const filePath = path.resolve(baseDir, this.config.connection.keyFilePath);
    this.GCS = new Storage({
      keyFilename: filePath,
    });
  }

  downloadFile(key, filePath) {
    const options = {
      destination: filePath,
    };

    return this.GCS.bucket(this.config.connection.bucket)
      .file(key)
      .download(options);
  }

  listObjects(prefix) {
    const options = {
      prefix: prefix,
    };

    return this.GCS.bucket(this.config.connection.bucket)
      .getFiles(options)
      .then((data) => data[0]);
  }
}

module.exports = GCSClient;
