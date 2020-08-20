const { check, PgLazyError } = require('../utils');
const Prepared = require('./Prepared');
const SqlStatement = require('./SqlStatement');
exports.pgExtend = function (pg, settings) {
  class Client extends pg.Client {
    constructor (opts = {}) {
      super({ ...settings, ...opts });
    }

    _query (...args) {
      return super.query(...args);
    }

    async many (sql, params) {
      const result = await this.query(sql, params);
      return result.rows;
    }

    async one (sql, params) {
      const result = await this.query(sql, params);
      check(result.rowCount > 1, 'one() result has more than one row, use many() instead');
      return result.rows[0];
    }

    async none (sql, params) {
      const result = await this.query(sql, params);
      check(!!result.rowCount, 'none() result has atleast one row, expected it to be none, use many() instead');
      return true;
    }

    async canConnect () {
      let res, client, error;
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
    }

    query (statement, _, cb) {
      if (typeof cb === 'function') {
        return this._query.apply(this, arguments);
      }
      SqlStatement.check(statement, true);
      return this._query(statement);
    }

    prepared (name) {
      return new Prepared(name, this.query.bind(this));
    }
  }
  class Pool extends pg.Pool {
    constructor (opts = {}) {
      super({ Client, ...settings, ...opts });
    }

    _query (...args) {
      return super.query(...args);
    }

    async many (sql, params) {
      const result = await this.query(sql, params);
      return result.rows;
    }

    async one (sql, params) {
      const result = await this.query(sql, params);
      check(result.rowCount > 1, 'one() result has more than one row, use many() instead');
      return result.rows[0];
    }

    async none (sql, params) {
      const result = await this.query(sql, params);
      check(!!result.rowCount, 'none() result has atleast one row, expected it to be none, use many() instead');
      return true;
    }

    async canConnect () {
      let res, client, error;
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
    }

    query (statement, _, cb) {
      if (typeof cb === 'function') {
        return this._query.apply(this, arguments);
      }
      SqlStatement.check(statement, true);
      return this._query(statement);
    }

    prepared (name) {
      return new Prepared(name, this.query.bind(this));
    }

    async withTransaction (runner) {
      const self = this;
      const client = await self.connect();
      let result;
      try {
        await client._query('BEGIN');
        result = await runner(client);
        await client._query('COMMIT');
      } catch (err) {
        await client._query('ROLLBACK');
        if (err.code === '40P01' || err.code === '40001') {
          return self.withTransaction(runner);
        }
        err.rolledback = true;
        throw new PgLazyError(err);
      } finally {
        client.release();
      }
      return result;
    }
  }
  return { Pool, Client };
};
