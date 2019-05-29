const url = require('url');
const { resolve } = require('path');
const semver = require('semver');
const mainPkgJson = require(resolve(process.cwd(), './package.json'));
const modulePkgJson = require('../package.json');
class PgLazyError extends Error {
  constructor (errObj) {
    super();
    errObj = typeof errObj === 'string' ? { message: errObj, code: 'ERR_OCCURED' } : errObj;
    Object.assign(this, errObj);
    this.name = this.constructor.name;
    this.date = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}
const checkVersions = () => {
  let currenPgVer;
  if (mainPkgJson.dependencies && mainPkgJson.dependencies.pg) {
    currenPgVer = mainPkgJson.dependencies.pg;
  } else if (mainPkgJson.devDependencies && mainPkgJson.devDependencies.pg) {
    currenPgVer = mainPkgJson.devDependencies.pg;
  } else {
    throw new PgLazyError({ message: 'Node-postgres is missing from package.json', code: 'ERR_MODULE_NOT_FOUND' });
  }
  const versionRequirements = [{
    name: 'node',
    currentVersion: semver.valid(semver.coerce(process.version)),
    versionRequirement: semver.validRange(modulePkgJson.engine.node)
  },
  {
    name: 'pg',
    currentVersion: semver.valid(semver.coerce(currenPgVer)),
    versionRequirement: semver.validRange(modulePkgJson.peerDependencies.pg)
  }
  ];
  for (const vReq of versionRequirements) {
    if (!semver.satisfies(vReq.currentVersion, vReq.versionRequirement)) {
      throw new PgLazyError(`${vReq.name} : ${vReq.currentVersion} should be ${vReq.versionRequirement}`);
    }
  }
};
const defaultOpts = {
  user: process.env.USER || process.env.LOGNAME || process.env.USERNAME,
  host: '127.0.0.1',
  database: '',
  password: null,
  port: 5432
};
const parseConfig = (config, extraConfig) => {
  let settings = {};
  if (config && config.constructor === Object) {
    if (config.connectionString) {
      settings = Object.assign(settings, config);
    } else {
      settings = Object.assign(defaultOpts, config);
    }
  } else if (config && typeof config === 'string') {
    const parsed = url.parse(config);
    if (parsed.protocol !== 'postgres:' || !parsed.hostname) {
      throw new PgLazyError('Invalid connection string');
    }
    settings = Object.assign(settings, { connectionString: config });
  } else {
    if (!process.env.PGUSER || !process.env.PGHOST) {
      throw new PgLazyError('Missing configuration settings');
    }
  }
  settings = Object.assign(settings, extraConfig);
  return settings;
};
const check = (condition, msg) => {
  if (condition) {
    return Promise.reject(new PgLazyError(msg));
  }
  return true;
};
module.exports = { PgLazyError, checkVersions, parseConfig, check };
