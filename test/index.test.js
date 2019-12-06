/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
const pgLazy = require('../');
const { createTable, removeTable } = require('./init');
const { connectionString, queryError } = require('./utils');
const { expect } = require('chai');
const { pg, Client, Pool, sql, _raw } = pgLazy(require('pg'), { connectionString, max: 5 });

const pool = new Pool();

async function withClient (runner) {
  const client = new Client();
  await client.connect();
  try {
    await runner(client);
  } catch (err) {
    console.warn(err.stack || err.message);
  } finally {
    await client.end();
  }
}

function cleanUp (p) {
  p.end();
  process.stdout.write('Shutting down Pool...\n\n');
}
after(() => {
  cleanUp(pool);
  removeTable();
});
before(() => {
  createTable();
});

describe('INDEX.TEST', () => {
  describe('TEST CONNECTION', () => {
    it('test connection', async () => {
      const { error, status } = await pool.isConnected();
      expect(error).to.be.undefined;
      expect(status).to.be.true;
    });
  });
  describe('POOL CONECTIONS', () => {
    it('pool works with multiple conenctions', async () => {
      const tasks = [];
      for (var x = 0; x < 5; x++) {
        const t = pool.withTransaction(async client => {
          return client.one(sql`SELECT 1 n`);
        });
        tasks.push(t);
      }
      const r = await Promise.all(tasks);
      for (const result of r) {
        expect(result.n).to.equal(1);
      }
    }).timeout(10000);
  });
  // WITHOUT TAG
  describe('WITHOUT TAG', () => {
    it('pool.query() requires tagged query', async () => {
      try {
        await pool.query('SELECT 1');
      } catch (e) {
        expect(e.message).to.match(queryError);
      }
    });

    it('client.query() requires tagged query', async () => {
      await withClient(async client => {
        try {
          await client.query('SELECT 1');
        } catch (e) {
          expect(e.message).to.match(queryError);
        }
      });
    });

    it('append() fails if untagged', async () => {
      try {
        await pool.query(sql`SELECT 1`.append('nope'));
      } catch (e) {
        expect(e.message).to.match(queryError);
      }
    });
  });
  // WITH TAG
  describe('WITH TAG', () => {
    it('client.query() works with sql tag', async () => {
      await withClient(async client => {
        const result = await client.query(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]}) ORDER BY n`);
        expect(result.rows).to.eql([{ n: 1 }, { n: 3 }]);
      });
    });
    it('client.query() works with _raw tag', async () => {
      await withClient(async client => {
        const result = await client.query(_raw`SELECT * FROM bars WHERE n IN (${1}, ${3}) ORDER BY n ${'desc'}`);
        expect(result.rows).to.eql([{ n: 3 }, { n: 1 }]);
      });
    });

    it('pool.query() works with sql tag', async () => {
      const result = await pool.query(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]}) ORDER BY n`);
      expect(result.rows).to.eql([{ n: 1 }, { n: 3 }]);
    });

    it('client.many() works with sql tag', async () => {
      await withClient(async client => {
        const rows = await client.many(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]})`);
        expect(rows).to.eql([{ n: 1 }, { n: 3 }]);
      });
    });

    it('pool.many() works with sql tag', async () => {
      const rows = await pool.many(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]})`);
      expect(rows).to.eql([{ n: 1 }, { n: 3 }]);
    });

    it('client.one() works with sql tag', async () => {
      await withClient(async client => {
        const row = await client.one(sql`SELECT * FROM bars WHERE n = ${2}`);
        expect(row).to.eql({ n: 2 });
      });
    });

    it('pool.one() works with sql tag', async () => {
      const row = await pool.one(sql`SELECT * FROM bars WHERE n = ${2}`);
      expect(row).to.eql({ n: 2 });
    });

    it('pool.none() works with sql tag', async () => {
      const row = await pool.none(sql`SELECT * FROM bars WHERE n = 10`);
      expect(row).to.be.true;
    });
  });
  // PARSING
  describe('PARSING', () => {
    it('parses int8 into Javascript integer', async () => {
      const { n } = await pool.one(sql`SELECT 123::int8 n`);
      // this would be a string "123" without the setTypeParser(20) fix
      expect(n).to.equal(123);
    });

    it('parses numerics into Javascript floats', async () => {
      const { n } = await pool.one(sql`SELECT 123::numeric n`);
      // this would be a string "123" without the setTypeParser(1700) fix
      expect(n).to.equal(123);
    });
  });
  // PREPARED
  describe('PREPARED', () => {
    it('prepared() requires tag', async () => {
      try {
        await pool.prepared('foo').many(`select * from bars where n = ${1}`);
      } catch (e) {
        expect(e.message).to.match(queryError);
      }
    });

    it('pool.prepared().query() works', async () => {
      const result = await pool.prepared('foo').query(sql`select * from bars where n = ${1}`);
      expect(result.rows).to.eql([{ n: 1 }]);
    });
    it('pool.prepared().many() works', async () => {
      const rows = await pool.prepared('foo').many(sql`select * from bars where n = ${1}`);
      expect(rows).to.eql([{ n: 1 }]);
    });
    it('pool.prepared().one() works', async () => {
      const row = await pool.prepared('foo').one(sql`select * from bars where n = ${1}`);
      expect(row).to.eql({ n: 1 });
    });
  });
  // TRANSACTION
  describe('TRANSACTION', () => {
    it('withTransaction sanity check', async () => {
      await pool.withTransaction(async client => {
        const { n } = await client.one(sql`SELECT 1 n`);
        expect(n).to.equal(1);
      });
    });

    it('withTransaction can successfully rollback', async () => {
      try {
        await pool.withTransaction(async () => {
          throw new Error('fake error');
        });
      } catch (err) {
        return expect(err.rolledback).to.be.true;
      }
    });
  });
  // SINGLETON
  describe('SINGLETON', () => {
    it('pool should already be connected and initialized', async () => {
      const p = pgLazy(require('pg'), { connectionString, max: 50 }, { singleton: true });

      const { error, status } = await p.pool.isConnected();
      expect(error).to.be.undefined;
      expect(status).to.be.true;

      const result = await p.pool.query(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]}) ORDER BY n`);
      expect(result.rows).to.eql([{ n: 1 }, { n: 3 }]);
      p.pool.end();
    });
  });
  // SANITY
  describe('SANITY', () => {
    it('should throw on missing pg module', async () => {
      try {
        const p = pgLazy();
      } catch (e) {
        expect(e).to.match(/missing required module `pg`/);
      }
    });
  });
});
