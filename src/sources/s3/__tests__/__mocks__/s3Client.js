const path = require('path');
const AWSMock = require('mock-aws-s3');

const basePath = path.join(__dirname, '../__fixtures__');

AWSMock.config.basePath = basePath;

class MockS3Client {
  constructor (config) {
    this.config = config;
    this.S3 = AWSMock.S3({
      params: { Bucket: 'test-bucket', MaxKeys: 1, Delimiter: '/' }
    });
  }

  getObjectFileStream (key) {
    return this.S3
      .getObject({ Bucket: this.config.connection.bucket, Key: key })
      .createReadStream();
  }

  listObjects (prefix, continuationToken = null) {
    return new Promise((resolve, reject) => {
      this.S3.listObjectsV2(
        {
          Bucket: this.config.connection.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken
        },
        (err, data) => {
          if (!err) {
            resolve(data);
          } else {
            reject(err);
          }
        }
      );
    });
  }
}

module.exports = MockS3Client;
