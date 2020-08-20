const SqlStatement = require('./lib/SqlStatement');

const { pgExtend } = require('./lib/Extend');
const { parseConfig, PgLazyError } = require('./utils');

module.exports = (pg, config, extraConfig = {}) => {
  if (pg) {
    const settings = parseConfig(config, extraConfig);
    pg.types.setTypeParser(20, (val) => {
      return val === null ? null : Number.parseInt(val, 10);
    });
    pg.types.setTypeParser(1700, (val) => {
      return val === null ? null : Number.parseFloat(val);
    });
    const { Pool, Client } = pgExtend(pg, settings);
    const payload = { pg, Pool, Client, sql: SqlStatement.sql, _raw: SqlStatement._raw };
    if (extraConfig.singleton && extraConfig.singleton === true) {
      payload.pool = new Pool();
    }
    return payload;
  } else {
    throw new PgLazyError('missing required module `pg`');
  }
};
