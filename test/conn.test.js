/**
 * Use Environment variables for configuration
 */

const pgLazy = require('../src');
const connectionString = 'postgres://localhost:5432/pg_test';
const connectionString2 = 'postgres://localhost:5431/pg_test';
const configObj = {
  user: '',
  host: 'localhost',
  database: 'pg_test',
  password: '',
  port: 5432
};
describe('CONNECTION.TEST', () => {
  test.concurrent('pgLazy should throw on non object config', async () => {
    let err;
    try {
      const { pool } = pgLazy(require('pg'), connectionString);
      expect(pool).toBeUndefined();
    } catch (e) {
      err = e.message;
    }
    expect(err).toMatch(/must be an object/);
  });
  test.concurrent('pgLazy isConnected should return false if it cannot connect', async () => {
    const { pool } = pgLazy(require('pg'), { connectionString: connectionString2 });
    const { error, status } = await pool.isConnected();
    expect(error).toBeDefined();
    expect(status).toBeFalsy();
  });
  test('pgLazy isConnected should return true if it can connect', async () => {
    const { pool } = pgLazy(require('pg'), { connectionString });
    const { error, status } = await pool.isConnected();
    expect(error).toBeUndefined();
    expect(status).toBeTruthy();
  });
  test('pgLazy should connect ok using object type config', async () => {
    const { pool } = pgLazy(require('pg'), configObj);
    const { error, status } = await pool.isConnected();
    expect(error).toBeUndefined();
    expect(status).toBeTruthy();
  });
});
describe('SANITY.TEST', () => {
  test('pgLazy should throw on mismatch node version', async () => {
    let err;
    const origVersion = process.version;
    process.version = 'v6.3.0';
    try {
      require('../src');
    } catch (e) {
      err = e.message;
    }
    process.version = origVersion;
    expect(err).toMatch(/Node version mismatch/);
  });
  test('pgLazy should throw on mismatch node-postgres version', async () => {
    let err;
    const origCwd = process.cwd;
    process.cwd = () => __dirname;
    try {
      require('../src');
    } catch (e) {
      err = e.message;
    }
    process.cwd = origCwd;
    expect(err).toMatch(/node-postgres mismatch/);
  });
});
