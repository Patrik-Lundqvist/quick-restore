const fs = require('fs-extra');
const path = require('path');

const getConfig = baseDir =>
  fs.readJsonSync(path.join(baseDir, 'settings.json'));

module.exports = { getConfig };
