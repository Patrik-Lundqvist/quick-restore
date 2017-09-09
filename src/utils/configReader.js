const fs = require('fs-extra');
const path = require('path');

const getConfig = async baseDir => {
  const configPath = path.join(baseDir, 'config.json');
  try {
    return await fs.readJson(configPath);
  } catch (err) {
    throw new Error(`Could not load config file at ${configPath}`);
  }
};

module.exports = { getConfig };
