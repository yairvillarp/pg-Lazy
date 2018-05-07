const { check, PgLazyError } = require('./utils');
exports.many = async function (sql, params) {
  const result = await this.query(sql, params);
  return result.rows;
};
exports.one = async function (sql, params) {
  const result = await this.query(sql, params);
  check(result.rowCount > 1, 'one() result has more than one row, use many() instead');
  return result.rows[0];
};
exports.none = async function (sql, params) {
  const result = await this.query(sql, params);
  check(!!result.rowCount, 'none() result has atleast one row, expected it to be none, use many() instead');
  return true;
};
exports.isConnected = async function () {
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
};

exports.withTransaction = async function (runner) {
  const self = this;
  const client = await self.connect();

  let result;
  const rollback = async err => {
    try {
      await client._query('ROLLBACK');
    } catch (e) {
      console.warn('Could not rollback transaction, removing from pool');
      client.release(e);
      e.rolledback = false;
      throw new PgLazyError(e);
    }
    client.release();
    if (err.code === '40P01' || err.code === '40001') {
      return self.withTransaction(runner);
    }
    err.rolledback = true;
    throw new PgLazyError(err);
  };

  try {
    await client._query('BEGIN');
    result = await runner(client);
    await client._query('COMMIT');
  } catch (err) {
    return rollback(err);
  }
  client.release();
  return result;
};
