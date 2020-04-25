const S3 = require("aws-sdk/clients/s3");

class S3Client {
  constructor(config) {
    this.config = config;
    this.S3 = new S3({
      apiVersion: "2006-03-01",
      secretAccessKey: this.config.connection.secretAccessKey,
      accessKeyId: this.config.connection.accessKeyId,
    });
  }

  getObjectFileStream(key) {
    return this.S3.getObject({
      Bucket: this.config.connection.bucket,
      Key: key,
    }).createReadStream();
  }

  listObjects(prefix, continuationToken = null) {
    return new Promise((resolve, reject) => {
      this.S3.listObjectsV2(
        {
          Bucket: this.config.connection.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        },
        (err, data) => {
          if (!err) {
            resolve(data);
          } else {
            reject(err);
          }
        },
      );
    });
  }
}

module.exports = S3Client;
