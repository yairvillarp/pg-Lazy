/**
 * Use Environment variables for configuration
 * PGHOST='localhost'
 * PGUSER=process.env.USER
 * PGDATABASE=process.env.USER
 * PGPASSWORD=null
 * PGPORT=5432
 *
 */

const defaultOpts = {
  user: process.env.USER || process.env.LOGNAME || process.env.USERNAME,
  host: '127.0.0.1',
  database: '',
  password: null,
  port: 5432
};
const SqlStatement = require('./SqlStatement');
const { sql, _raw } = SqlStatement;
// throws on falsy values and if statement express is falsy
const isTrue = (statement, msg) => {
  if (!statement) {
    throw new Error(`[DB]: ${msg}` || 'Error occured!');
  }
  return true;
};

// =========================================================
const query = function(statement, _, cb) {
  if (typeof cb === 'function') {
    return this._query.apply(this, arguments);
  }

  if (!(statement instanceof SqlStatement)) {
    return Promise.reject(new Error('must build query with sql or _raw'));
  }
  return this._query(statement);
};

// make helpers more strict. throw an assertion error if not met
const many = async function(sql, params) {
  const result = await this.query(sql, params);
  return result.rows;
};
const one = async function(sql, params) {
  const result = await this.query(sql, params);
  isTrue(result.rows.length <= 1, ' Got more than 1 result');
  return result.rows[0];
};
const none = async function(sql, params) {
  const result = await this.query(sql, params);
  isTrue(!result.rows.length, ' Got some rows, expected it to be none');
  // if no result is expected, return true
  return true;
};
const isConnected = async function() {
  let res;
  let client;
  let error;
  try {
    client = await this.connect();
    res = { error, status: true };
  } catch (err) {
    error = err.message;
    res = { error, status: false };
  } finally {
    if (client) {
      await client.end();
    }
  }
  return res;
};
const withTransaction = async function(runner) {
  const client = await this.connect();

  async function rollback(err) {
    try {
      await client._query('ROLLBACK');
    } catch (err) {
      console.warn('Could not rollback transaction, removing from pool');
      client.release(err);
      err.rolledback = false;
      throw err;
    }
    client.release();
    if (err.code === '40P01' || err.code === '40001') {
      // Deadlock or Serialization error
      return withTransaction(runner);
    }
    err.rolledback = true;
    throw err;
  }

  try {
    await client._query('BEGIN');
  } catch (err) {
    return rollback(err);
  }

  let result;
  try {
    result = await runner(client);
  } catch (err) {
    return rollback(err);
  }

  try {
    await client._query('COMMIT');
  } catch (err) {
    return rollback(err);
  }

  client.release();
  return result;
};

class Prepared {
  constructor(name, onQuery) {
    this.name = name;
    this.onQuery = onQuery;
  }

  query(statement) {
    isTrue(statement instanceof SqlStatement, 'must build query with sql or _raw');
    return this.onQuery(statement.named(this.name));
  }
}
Prepared.prototype.many = many;

Prepared.prototype.one = one;

const prepared = function(name) {
  return new Prepared(name, this.query.bind(this));
};

function extend(pg) {
  pg.Client.prototype._query = pg.Client.prototype.query;
  pg.Pool.super_.prototype._query = pg.Pool.super_.prototype.query;
  pg.Client.prototype.query = pg.Pool.super_.prototype.query = query;
  pg.Client.prototype.many = pg.Pool.super_.prototype.many = many;
  pg.Client.prototype.one = pg.Pool.super_.prototype.one = one;
  pg.Client.prototype.none = pg.Pool.super_.prototype.none = none;
  pg.Client.prototype.isConnected = pg.Pool.super_.prototype.isConnected = isConnected;
  pg.Client.prototype.prepared = pg.Pool.super_.prototype.prepared = prepared;
  pg.Pool.super_.prototype.withTransaction = withTransaction;
  pg.types.setTypeParser(20, val => {
    return val === null ? null : Number.parseInt(val, 10);
  });
  pg.types.setTypeParser(1700, val => {
    return val === null ? null : Number.parseFloat(val);
  });
  return pg;
}

// ========================================================
// Parameters: (node-pg, config = defaults to env)
// Returns: {pool,pg, sql, _raw}
const pgLazy = (pg, config) => {
  isTrue(pg, 'node-postgres is missing');
  const superPg = extend(pg);
  let pool;
  let settings = {};
  if (config && config.constructor === Object) {
    if (config['connectionString']) {
      settings = config;
    } else {
      settings = Object.assign(defaultOpts, config);
    }
  } else if (config && config.constructor === String) {
    throw new Error('Configuration settings must be an object');
  } else {
    console.warn('No configuration settings passed, will use environment variables if available');
  }
  if (Object.keys(settings).length < 1) {
    pool = new superPg.Pool();
  } else {
    pool = new superPg.Pool(settings);
  }

  return { pool, pg: superPg, sql, _raw };
};

module.exports = pgLazy;
