const pgLazy = require('../');
const { connectionString } = require('./utils');
const { pool, _raw } = pgLazy(require('pg'), { connectionString }, {
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 5000,
  max: 1,
  singleton: true
});

exports.createTable = async function () {
  return pool.query(_raw`
    CREATE TABLE IF NOT EXISTS bars (n int not null);
    INSERT INTO bars (n) values (1), (2), (3);`);
};

exports.removeTable = async function () {
  return pool.query(_raw`DROP TABLE bars;`);
};
