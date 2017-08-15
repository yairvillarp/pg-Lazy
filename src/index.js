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
  port: 5433
}
const SqlStatement = require('./SqlStatement')
let timerStart = false
// throws on falsy values and if statement express is falsy
const isTrue = (statement, msg) => {
  if (!statement) {
    throw new Error(`[DB]: ${msg}` || 'Error occured!')
  }
  return true
}

// =========================================================
const query = function (statement, _, cb) {
  if (typeof cb === 'function') {
    return this._query.apply(this, arguments)
  }

  if (!(statement instanceof SqlStatement)) {
    return Promise.reject(new Error('must build query with sql or _raw'))
  }
  return this._query(statement)
}

// make helpers more strict. throw an assertion error if not met
const many = async function (sql, params) {
  const result = await this.query(sql, params)
  return result.rows
}
const one = async function (sql, params) {
  const result = await this.query(sql, params)
  isTrue(result.rows.length === 1, ' Got more than 1 result')
  return result.rows[0]
}
const none = async function (sql, params) {
  const result = await this.query(sql, params)
  isTrue(!result.rows.length, ' Got some rows, expected it to be none')
  // if no result is expected, return true
  return true
}
const withTransaction = async function (runner) {
  const client = await this.connect()

  async function rollback (err) {
    try {
      await client._query('ROLLBACK')
    } catch (err) {
      console.warn('Could not rollback transaction, removing from pool')
      client.release(err)
      err.rolledback = false
      throw err
    }
    client.release()

    if (err.code === '40P01') {
      // Deadlock
      return withTransaction(runner)
    } else if (err.code === '40001') {
      // Serialization error
      return withTransaction(runner)
    }
    err.rolledback = true
    throw err
  }

  try {
    await client._query('BEGIN')
  } catch (err) {
    return rollback(err)
  }

  let result
  try {
    result = await runner(client)
  } catch (err) {
    return rollback(err)
  }

  try {
    await client._query('COMMIT')
  } catch (err) {
    return rollback(err)
  }

  client.release()
  return result
}

class Prepared {
  constructor (name, onQuery) {
    this.name = name
    this.onQuery = onQuery
  }

  query (statement) {
    isTrue(statement instanceof SqlStatement, 'must build query with sql or __raw')
    return this.onQuery(statement.named(this.name))
  }
}
Prepared.prototype.many = many

Prepared.prototype.one = one

const prepared = function (name) {
  return new Prepared(name, this.query.bind(this))
}

function extend (pg) {
  pg.Client.prototype._query = pg.Client.prototype.query
  pg.Pool.super_.prototype._query = pg.Pool.super_.prototype.query
  pg.Client.prototype.query = pg.Pool.super_.prototype.query = query
  pg.Client.prototype.many = pg.Pool.super_.prototype.many = many
  pg.Client.prototype.one = pg.Pool.super_.prototype.one = one
  pg.Client.prototype.none = pg.Pool.super_.prototype.none = none
  pg.Client.prototype.prepared = pg.Pool.super_.prototype.prepared = prepared
  pg.Pool.super_.prototype.withTransaction = withTransaction
  pg.types.setTypeParser(20, val => {
    return val === null ? null : Number.parseInt(val, 10)
  })
  pg.types.setTypeParser(1700, val => {
    return val === null ? null : Number.parseFloat(val)
  })
  return pg
}
function noop () {}
let counterDefault = noop

function tasker () {
  if (timerStart) return
  timerStart = true
  const timerTask = setTimeout(() => {
    counterDefault()
    timerStart = false
    clearTimeout(timerTask)
  }, 5000)
}
tasker()

// ========================================================
// Parameters: (node-pg, type, config = defaults to env, counterfn, onErr)
// Returns: {pool/client, sql, _raw}
function pgLazy (pg, type = 'pool', config = undefined, watchers) {
  isTrue(pg, 'Node-pg is missing')
  watchers = Object.assign({ count: noop, onErr: noop }, watchers)
  const superPg = extend(pg)
  let pool
  let client
  let settings = {}
  if (config && config.constructor === Object) {
    const connString = config['connectionString']
    if (connString && typeof connString === 'string') {
      settings['connectionString'] = connString
    } else {
      settings = Object.assign(defaultOpts, config)
    }
  } else {
    console.warn('No configuration settings passed, will use environment variables if available')
  }
  if (type === 'pool') {
    pool = new superPg.Pool(settings)
  } else if (type === 'client') {
    client = new superPg.Client(settings)
  }
  if (pool) {
    pool.on('error', watchers.onErr)
    counterDefault = () => {
      const dbInfo = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
      watchers.count(dbInfo)
    }
  } else if (client) {
    client.on('error', watchers.onErr)
  }

  return { pool, client, pg: superPg, sql: SqlStatement.sql, _raw: SqlStatement._raw }
}

module.exports = pgLazy
