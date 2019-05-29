/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions */
const pgLazy = require('../');
const { connectionString, connectionObject } = require('./utils');
const { expect } = require('chai');
const connectionString2 = 'postgres://localhost:5431/pg_test';

describe('CONNECTION.TEST', () => {
  it('pgLazy should not throw on non object config', async () => {
    const { Pool } = pgLazy(require('pg'), connectionString);
    expect(Pool).to.not.be.undefined;
  });
  it('pgLazy isConnected should return false if it cannot connect', async () => {
    const { Pool } = pgLazy(require('pg'), { connectionString: connectionString2 });
    const pool = new Pool();
    const { error, status } = await pool.isConnected();
    expect(error).to.not.be.undefined;
    expect(status).to.be.false;
    pool.end();
  }).timeout(5000);
  it('pgLazy isConnected should return true if it can connect', async () => {
    const { Pool } = pgLazy(require('pg'), { connectionString });
    const pool = new Pool();
    const { error, status } = await pool.isConnected();
    expect(error).to.be.undefined;
    expect(status).to.be.true;
    pool.end();
  }).timeout(5000);
  it('pgLazy should connect ok using object type config', async () => {
    const { Pool } = pgLazy(require('pg'), connectionObject);
    const pool = new Pool();
    const { error, status } = await pool.isConnected();
    expect(error).to.be.undefined;
    expect(status).to.be.true;
    pool.end();
  }).timeout(5000);
});
