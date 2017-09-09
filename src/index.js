#! /usr/bin/env node
const configReader = require('./utils/configReader');
const logger = require('./utils/logger');
const MssqlTarget = require('./targets/mssql');
const S3Source = require('./sources/s3');
const path = require('path');
const packageSettings = require('../package');
const baseDir = path.join(process.cwd(), `/.${packageSettings.name}`);

const config = configReader.getConfig(baseDir);
const source = new S3Source(config.source, baseDir, logger);
const target = new MssqlTarget(config.target, baseDir, logger);

const runWithSource = async () => {
  const file = await source.downloadLatestFile();
  await target.restore(file);
};

runWithSource()
  .then(() => {
    logger('Done!', '🎉');
  })
  .catch(err => logger(err, '⚠️'));
