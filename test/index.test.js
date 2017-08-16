// Parameters: (node-pg, type, config = defaults to env)
// Returns: { pool, client, pg, sql, _raw };

const pgLazy = require('../src')
const connectionString = 'postgres://localhost:5432/pg_test'
const { pool, sql, _raw, pg } = pgLazy(require('pg'), { connectionString, max: 50 })

const { Client } = pg

async function withClient (runner) {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await runner(client)
  } catch (err) {
    console.warn(err.stack || err.message)
  } finally {
    await client.end()
  }
}
function cleanUp (p) {
  p.end()
  process.stdout.write('Shutting down Pool...\n\n')
}
afterAll(() => {
  cleanUp(pool)
})

describe('INDEX.TEST', () => {
  describe('TEST CONNECTION', () => {
    test.concurrent('test connection', async () => {
      const { error, status } = await pool.isConnected()
      expect(error).toBeUndefined()
      expect(status).toEqual(true)
    })
  })
  // WITHOUT TAG
  describe('WITHOUT TAG', () => {
    test.concurrent('pool.query() requires tagged query', async () => {
      let err
      try {
        await pool.query('SELECT 1')
      } catch (e) {
        err = e.message
      }
      expect(err).toMatch(/must build/)
    })

    test.concurrent('client.query() requires tagged query', async () => {
      await withClient(async client => {
        let err
        try {
          await client.query('SELECT 1')
        } catch (e) {
          err = e.message
        }
        expect(err).toMatch(/must build/)
      })
    })

    test.concurrent('append() fails if untagged', async () => {
      let err
      try {
        await pool.query(sql`SELECT 1`.append('nope'))
      } catch (e) {
        err = e.message
      }
      expect(err).toMatch(/must build/)
    })
  })
  // WITH TAG
  describe('WITH TAG', () => {
    test.concurrent('client.query() works with sql tag', async () => {
      await withClient(async client => {
        const result = await client.query(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]}) ORDER BY n`)
        expect(result.rows).toEqual([{ n: 1 }, { n: 3 }])
      })
    })
    test.concurrent('client.query() works with _raw tag', async () => {
      await withClient(async client => {
        const result = await client.query(_raw`SELECT * FROM bars WHERE n IN (${1}, ${3}) ORDER BY n ${'desc'}`)
        expect(result.rows).toEqual([{ n: 3 }, { n: 1 }])
      })
    })

    test.concurrent('pool.query() works with sql tag', async () => {
      const result = await pool.query(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]}) ORDER BY n`)
      expect(result.rows).toEqual([{ n: 1 }, { n: 3 }])
    })

    test.concurrent('client.many() works with sql tag', async () => {
      await withClient(async client => {
        const rows = await client.many(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]})`)
        expect(rows).toEqual([{ n: 1 }, { n: 3 }])
      })
    })

    test.concurrent('pool.many() works with sql tag', async () => {
      const rows = await pool.many(sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]})`)
      expect(rows).toEqual([{ n: 1 }, { n: 3 }])
    })

    test.concurrent('client.one() works with sql tag', async () => {
      await withClient(async client => {
        const row = await client.one(sql`SELECT * FROM bars WHERE n = ${2}`)
        expect(row).toEqual({ n: 2 })
      })
    })

    test.concurrent('pool.one() works with sql tag', async () => {
      const row = await pool.one(sql`SELECT * FROM bars WHERE n = ${2}`)
      expect(row).toEqual({ n: 2 })
    })

    test.concurrent('pool.none() works with sql tag', async () => {
      const row = await pool.none(sql`SELECT * FROM bars WHERE n = 10`)
      expect(row).toBeTruthy()
    })
  })
  // PARSING
  describe('PARSING', () => {
    test.concurrent('parses int8 into Javascript integer', async () => {
      const { n } = await pool.one(sql`SELECT 123::int8 n`)
      // this would be a string "123" without the setTypeParser(20) fix
      expect(n).toBe(123)
    })

    test.concurrent('parses numerics into Javascript floats', async () => {
      const { n } = await pool.one(sql`SELECT 123::numeric n`)
      // this would be a string "123" without the setTypeParser(1700) fix
      expect(n).toBe(123)
    })
  })
  // PREPARED
  describe('PREPARED', () => {
    test.concurrent('prepared() requires tag', async () => {
      let err
      try {
        await pool.prepared('foo').many(`select * from bars where n = ${1}`)
      } catch (e) {
        err = e.message
      }
      expect(err).toMatch(/must build/)
    })

    test.concurrent('pool.prepared().query() works', async () => {
      const result = await pool.prepared('foo').query(sql`select * from bars where n = ${1}`)
      expect(result.rows).toEqual([{ n: 1 }])
    })
    test.concurrent('pool.prepared().many() works', async () => {
      const rows = await pool.prepared('foo').many(sql`select * from bars where n = ${1}`)
      expect(rows).toEqual([{ n: 1 }])
    })
    test.concurrent('pool.prepared().one() works', async () => {
      const row = await pool.prepared('foo').one(sql`select * from bars where n = ${1}`)
      expect(row).toEqual({ n: 1 })
    })
  })
  // TRANSACTION
  describe('TRANSACTION', () => {
    test.concurrent('withTransaction sanity check', async () => {
      await pool.withTransaction(async client => {
        const { n } = await client.one(sql`SELECT 1 n`)
        expect(n).toBe(1)
      })
    })

    test.concurrent('withTransaction can successfully rollback', async () => {
      try {
        await pool.withTransaction(async () => {
          throw new Error('fake error')
        })
      } catch (err) {
        return expect(err.rolledback).toBeTruthy()
      }
    })
  })
})
