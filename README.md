
`Requires Node v8.x and node-pg >= 7.1.2`

# pg-Lazy [![Build Status](https://travis-ci.org/uniibu/pg-Lazy.svg?branch=master)](https://travis-ci.org/uniibu/pg-Lazy) [![NPM version](https://badge.fury.io/js/pg-lazy.svg)](http://badge.fury.io/js/pg-lazy) [![Dependency Status](https://david-dm.org/uniibu/pg-lazy.svg)](https://david-dm.org/uniibu/pg-lazy)

Nothin complex here, just simple helpers for [node-postgres][node-postgres].

## Installation

`npm install pg-lazy`

## Usage

```js
const pgLazy = require('pg-lazy');
// create your configuration
const connectionString = 'postgres://localhost:5432/pg_extra_test';
// pool/client instance is already initiated, you can still initialize it using pg.Pool or pg.Client
const { pool, sql, _raw, pg } = pgLazy(require('pg'), 'pool', { connectionString }, counter, onErr);

function onErr(err) {
  console.warn(err.stack || err.message);
}
function counter(totalinfo) {
  console.log(totalinfo);
}

async function getUser(name,id){
  // regular query
  return pool.query(sql`SELECT * FROM TABLE WHERE name = ${name}`);
  // many for more than 1 result
  return pool.many(sql`SELECT * FROM TABLE WHERE id > ${id}`);
  // one for single result
  return pool.one(sql`SELECT * FROM TABLE WHERE id = ${id}`);
  // none for no result
  return pool.many(sql`SELECT * FROM TABLE WHERE id < 0`);
}
async function(){
  const username = await getUser('john',5)
}
```

## Helpers

- pg.Pool with prototype methods `query`,`many`, `one`, `none`, `withTransaction`.
- pg.Client with prototype methods `query`,`many`, `one`, `none`.
- Extends both with `.prepared(name).{query,many,one}()`
- All methods returns a Promise
- Automatically defaults to Environment variables for DB config, that means you
  can also set your DB config via `process.env`
- Configures the client parser to parse postgres ints and numerics
  into javascript numbers (else `SELECT 1::int8` would return a string "1").
- Accepts Objects and connectionString for configuration, 
- Exposes `sql` and `_raw` template literal helpers for writing queries.

    ``` javascript
    const uname = 'nisha42'
    const key = 'uname'
    const direction = 'desc'

    await pool.one(sql`
      SELECT *
      FROM users
      WHERE lower(uname) = lower(${uname})
    `.append(_raw`ORDER BY ${key} ${direction}`))
    ```
- All query methods fail if the query you pass in is not built with the
  `sql` or `_raw` tag. This avoids the issue of accidentally introducing
  sql injection with template literals. If you want normal template literal
  behavior (dumb interpolation), you must tag it with `_raw`.

## Install

    npm install --save pg-Lazy pg

## Usage / Example

``` javascript
const pgLazy = require('pg-lazy');
const url = 'postgres://user:pass@localhost:5432/my-db'
const { pool, sql, _raw, pg } = pgLazy(require('pg'), 'pool', { connectionString:url });

exports.findUserByUname = async function (uname) {
  return pool.one(sql`
    SELECT *
    FROM users
    WHERE lower(uname) = lower(${uname})
  `)
}

exports.listUsersInCities = async function (cities, direction = 'DESC') {
  return pool.many(sql`
    SELECT *
    FROM users
    WHERE city = ANY (${cities})
  `.append(_raw`ORDER BY uname ${direction}`))
}

exports.transferBalance = async function (from, to, amount) {
  return pool.withTransaction(async (client) => {
    await client.query(sql`
      UPDATE accounts SET amount = amount - ${amount} WHERE id = ${from}
    `)
    await client.query(sql`
      UPDATE accounts SET amount = amount + ${amount} WHERE id = ${to}
    `)
  })
}
```

### Query template tags

pg-extra forces you to tag template strings with `sql` or `_raw`.
You usually use `sql`.

`sql` is a simple helper that translates this:

``` javascript
sql`
  SELECT *
  FROM users
  WHERE lower(uname) = lower(${'nisha42'})
    AND faveFood = ANY (${['kibble', 'tuna']})
`
```

into the sql bindings object that node-postgres expects:

``` javascript
{
  text: `
    SELECT *
    FROM users
    WHERE lower(uname) = lower($1)
      AND faveFood = ANY ($2)
  `,
  values: ['nisha42', ['kibble', 'tuna']]
}
```

`_raw` is how you opt-in to regular string interpolation, made ugly
so that it stands out.

Use `.append()` to chain on to the query. The argument to `.append()`
must also be tagged with `sql` or `_raw`.


``` javascript
sql`${'foo'} ${'bar'}`.append(_raw`${'baz'}`) // '$1 $2 baz'
_raw`${'foo'} ${'bar'}`.append(sql`${'baz'}`) // 'foo bar $1'
```

## Test

Setup local postgres database with seeded rows that the tests expect:

    $ createdb pg_test
    $ psql pg_test
    $ psql -d pg_test -c 'create table bars (n int not null);'
    $ psql -d pg_test -c 'insert into bars (n) values (1), (2), (3);'

Then run the tests:

    npm test

## TODO

- Add more Helpers

[node-postgres]: https://github.com/brianc/node-postgres

## Shouts

- Heavily inspired by [pg-extra](https://github.com/danneu/pg-extra) which no longer been updated for several months, and now breaks on latest pg 7.
