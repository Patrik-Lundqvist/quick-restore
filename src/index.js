#! /usr/bin/env node
const configReader = require("./utils/configReader");
const logger = require("./utils/logger");
const MssqlTarget = require("./targets/mssql");
const S3Source = require("./sources/s3");
const GCSSource = require("./sources/gcs");
const path = require("path");
const fs = require("fs-extra");
const packageSettings = require("../package");
const baseDir = path.join(process.cwd(), `/${packageSettings.name}`);
const userArgs = process.argv.slice(2);
const filePath = userArgs[0];

const runWithFile = async (file, target) => {
  const fullPath = path.resolve(file);
  const fileExists = await fs.pathExists(fullPath);
  if (!fileExists) {
    throw new Error(`File ${fullPath} not found`);
  }

  await target.restore(fullPath);
};

const runWithSource = async (source, target) => {
  const file = await source.downloadLatestFile();
  await target.restore(file);
};

const getTarget = (config) => {
  if (!config.target) {
    throw new Error("No target setting found");
  }
  return new MssqlTarget(config.target, baseDir, logger);
};

const getSource = (config) => {
  if (!config.source) {
    throw new Error("No source setting found");
  }

  if (config.source.client === "gcs") {
    return new GCSSource(config.source, baseDir, logger);
  } else if (config.source.client === "s3") {
    return new S3Source(config.source, baseDir, logger);
  }

  throw new Error("No matching source client found");
};

const restore = async () => {
  const config = await configReader.getConfig(baseDir);
  const target = getTarget(config);

  if (filePath) {
    return runWithFile(filePath, target);
  } else {
    const source = getSource(config);
    return runWithSource(source, target);
  }
};

restore()
  .then(() => {
    logger("Done!", "🎉");
  })
  .catch((err) => logger(err, "⚠️"));
