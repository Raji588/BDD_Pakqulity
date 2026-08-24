require('dotenv').config();

module.exports = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  headless: process.env.HEADLESS !== 'false',
  slowMo: Number(process.env.SLOW_MO || 0),
  storageStatePath: process.env.STORAGE_STATE_PATH || 'tests/storageStates/user.json'
};
