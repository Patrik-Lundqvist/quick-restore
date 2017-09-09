const fs = require('fs-extra');
const fst = require('fs');
const path = require('path');
const S3Client = require('./s3Client');
const noop = require('../../utils/noop');

const baseConfig = {
  connection: {
    secretAccessKey: '',
    accessKeyId: '',
    bucket: ''
  },
  prefix: ''
};

class S3Source {
  constructor (config, baseDir, logFn, S3 = S3Client) {
    this.s3 = new S3(config);
    this.baseDir = baseDir;
    this.cacheDir = path.join(this.baseDir, `/cache/s3`);
    this.cacheInfoPath = path.join(this.cacheDir, `/cache.json`);
    this.config = Object.assign({}, baseConfig, config);
    this.log = logFn || noop;
  }

  downloadFile (key, file) {
    return new Promise((resolve, reject) => {
      this.log(`Downloading [${key}]`);
      const writeStream = fst.createWriteStream(file);
      this.s3
        .getObjectFileStream(key)
        .pipe(writeStream)
        .on('finish', () => resolve(file));
    });
  }

  async createCacheInfo (file, etag) {
    try {
      await fs.writeJson(this.cacheInfoPath, { file, etag });
    } catch (err) {
      throw new Error('Could not write cache file');
    }
  }

  async readCacheInfo () {
    try {
      return await fs.readJson(this.cacheInfoPath);
    } catch (err) {
      return null;
    }
  }

  async downloadLatestFile () {
    const cacheInfo = await this.readCacheInfo();
    const latestObject = await this.getLatestObject();
    if (!latestObject) {
      throw new Error('No matching file on S3');
    }

    const escapedEtag = latestObject.ETag.replace(/"/g, '');
    if (cacheInfo && cacheInfo.etag === escapedEtag) {
      this.log(`Using cache [${cacheInfo.file}]`);
      return path.join(this.cacheDir, `/${cacheInfo.file}`);
    }
    const basename = path.basename(latestObject.Key);
    const dest = path.join(this.cacheDir, `/${basename}`);

    await fs.remove(`${this.cacheDir}/`);
    await fs.ensureFile(dest);
    await this.downloadFile(latestObject.Key, dest);
    await this.createCacheInfo(basename, escapedEtag);
    return dest;
  }

  async getLatestObject () {
    const objects = await this.getAllObjects(this.config.prefix);
    return this.findLatestObject(objects);
  }

  async getAllObjects (prefix, continuationToken = null, objects = []) {
    const data = await this.s3.listObjects(prefix, continuationToken);
    if (data.IsTruncated) {
      return this.getAllObjects(
        prefix,
        data.NextContinuationToken,
        objects.concat(data.Contents)
      );
    } else {
      return objects.concat(data.Contents);
    }
  }

  findLatestObject (objects) {
    return objects.reduce(
      (prev, current) =>
        (prev && prev.LastModified > current.LastModified ? prev : current),
      null
    );
  }
}

module.exports = S3Source;
