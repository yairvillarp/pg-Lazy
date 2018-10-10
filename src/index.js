const SqlStatement = require('./SqlStatement');
const PgPool = require('pg-pool');
const Prepared = require('./Prepared');
const { many, one, none, isConnected, withTransaction } = require('./Methods');
const { parseConfig, PgLazyError } = require('./utils');
const pgExtend = (pg, name, settings, methods) => {
  const pgOpts = { class: pg.Client, options: settings };
  if (name === 'BoundPool') {
    pgOpts.class = PgPool;
    pgOpts.options = { Client: pg._Client, ...settings };
  }
  const Base = class extends pgOpts.class {
    constructor(opts = {}) {
      super({ ...pgOpts.options, ...opts });
    }
    _query(...args) {
      return super.query(...args);
    }
    query(statement, _, cb) {
      const self = this;
      if (typeof cb === 'function') {
        return self._query.apply(self, arguments);
      }
      SqlStatement.check(statement, true);
      return self._query(statement);
    }
    prepared(name) {
      return new Prepared(name, this.query.bind(this));
    }
  };
  for (const [k, v] of Object.entries(methods)) {
    Base.prototype[k] = v;
  }
  Object.defineProperty(Base, 'name', { value: name });
  return Base;
};
module.exports = (pg, config, extraConfig = {}) => {
  if (pg) {
    const settings = parseConfig(config, extraConfig);
    pg._Client = pgExtend(pg, 'Client', settings, { many, one, none, isConnected });
    pg._Pool = pgExtend(pg, 'BoundPool', settings, { many, one, none, isConnected, withTransaction });
    pg.types.setTypeParser(20, (val) => {
      return val === null ? null : Number.parseInt(val, 10);
    });
    pg.types.setTypeParser(1700, (val) => {
      return val === null ? null : Number.parseFloat(val);
    });
    const payload = { pg, Pool: pg._Pool, Client: pg._Client, sql: SqlStatement.sql, _raw: SqlStatement._raw };
    if (extraConfig.singleton && extraConfig.singleton === true) {
      payload.pool = new pg._Pool();
    }
    return payload;
  } else {
    throw new PgLazyError('missing required module `pg`');
  }
};