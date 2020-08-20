const pgLazy = require('../');
const { connectionString } = require('./utils');
const { pool, _raw } = pgLazy(require('pg'), { connectionString: connectionString.pool }, {
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 3000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  max: 5,
  singleton: true
});
const { Client } = pgLazy(require('pg'), { connectionString: connectionString.client }, {
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 3000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0
});
const client = new Client();
client.connect();
exports.createTable = async function () {
  await client.query(_raw`
  CREATE TABLE IF NOT EXISTS bars (n int not null);
  INSERT INTO bars (n) values (1), (2), (3);`);
  return pool.query(_raw`
    CREATE TABLE IF NOT EXISTS bars (n int not null);
    INSERT INTO bars (n) values (1), (2), (3);`);
};

exports.removeTable = async function () {
  await client.query(_raw`DROP TABLE bars;`);
  await pool.query(_raw`DROP TABLE bars;`);
  client.end();
};
