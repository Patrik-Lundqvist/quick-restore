const fs = require('fs-extra');
const path = require('path');
const GCSClient = require('./gcsClient');
const noop = require('../../utils/noop');

const baseConfig = {
  connection: {
    bucket: '',
    keyFilePath: ''
  },
  prefix: ''
};

class GCSSource {
  constructor (config, baseDir, logFn, GCS = GCSClient) {
    this.gcs = new GCS(config, baseDir);
    this.baseDir = baseDir;
    this.cacheDir = path.join(this.baseDir, `/cache/gcs`);
    this.cacheInfoPath = path.join(this.cacheDir, `/cache.json`);
    this.config = Object.assign({}, baseConfig, config);
    this.log = logFn || noop;
  }

  async downloadFile (key, file) {
    await this.gcs.downloadFile(key, file);
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
      throw new Error('No matching file on GCS');
    }

    if (cacheInfo && cacheInfo.etag === latestObject.metadata.etag) {
      this.log(`Using cache [${cacheInfo.file}]`);
      return path.join(this.cacheDir, `/${cacheInfo.file}`);
    }
    const basename = path.basename(latestObject.name);
    const dest = path.join(this.cacheDir, `/${basename}`);

    await fs.remove(`${this.cacheDir}/`);
    await fs.ensureFile(dest);
    this.log(`Downloading file [${basename}]`);
    await this.downloadFile(latestObject.name, dest);
    await this.createCacheInfo(basename, latestObject.metadata.etag);
    return dest;
  }

  async getLatestObject () {
    const objects = await this.getAllObjects(this.config.prefix);
    return this.findLatestObject(objects);
  }

  async getAllObjects (prefix, objects = []) {
    const data = await this.gcs.listObjects(prefix);
    return objects.concat(data);
  }

  findLatestObject (objects) {
    return objects.reduce(
      (prev, current) =>
        (prev && prev.metadata.updated > current.metadata.updated ? prev : current),
      null
    );
  }
}

module.exports = GCSSource;
