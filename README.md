# pg-Lazy
[![Build Status](https://travis-ci.org/uniibu/pg-Lazy.svg?branch=master)](https://travis-ci.org/uniibu/pg-Lazy) [![NPM version](https://badge.fury.io/js/pg-lazy.svg)](http://badge.fury.io/js/pg-lazy) [![Dependency Status](https://david-dm.org/uniibu/pg-lazy.svg)](https://david-dm.org/uniibu/pg-lazy) [![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard) [![Coverage Status](https://coveralls.io/repos/github/uniibu/pg-Lazy/badge.svg?branch=master)](https://coveralls.io/github/uniibu/pg-Lazy?branch=master)

Simple functional helpers for [node-postgres](https://www.npmjs.com/package/pg).

`Requires Node >= 8.1.4 or ^9.0.0 or ^10.0.0 and node-postgres ^7.4.1`

## Breaking Changes from v1.x.x to v2.x.x

- Due to new es6 codes, this module now requires Node v8.1.4 and above.
- This module no longer mutates pg.Pool and pg.Client, it instead `extends` them and store them as `pg._Pool` and `pg._Client`
- It no longer automatically initialize the `Pool` unless a third Object argument is passed `{singleton:true}`
- `pg-Lazy` now returns a default Object `{ pg, Pool, Client, sql, _raw }` in which `Pool` is an instance of `pg._Pool` and Client is an instance of `pg._Client`. To get the original `pg.Pool` and `pg.Client` instances, you can use `pg` to access them.
- If `{singleton:true}` is passed as a third argument, it then adds `pool` from the returned Object. This `pool` is an already-initialized `pg._Pool`
- Read more changes here [ChangeLog](https://github.com/uniibu/pg-Lazy/blob/master/CHANGELOG.md)

## Installation

`npm install pg-lazy pg --save` or `yarn add pg-lazy pg`

## Usage

Manual Pool initialization:
```js
const pgLazy = require('pg-lazy');
// create your configuration
const connectionString = 'postgres://localhost:5432/pg_test';
// pool instance is no longer initiated, you must initialize it using pg.Pool.
const { Pool, sql, _raw, pg } = pgLazy(require('pg'), { connectionString });
const pool = new Pool()
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

Automatic Pool initialization:
```js
const pgLazy = require('pg-lazy');
// create your configuration
const connectionString = 'postgres://localhost:5432/pg_test';
// pool instance is automatically initialized when passing {singleton:true}
const { pool, sql, _raw, pg } = pgLazy(require('pg'), { connectionString }, {singleton:true});

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

- pg.Pool with prototype methods `query`,`many`, `one`, `none`, `withTransaction`, `isConnected`.
- pg.Client with prototype methods `query`,`many`, `one`, `none`, `isConnected`.
- Extends both with `.prepared(name).{query,many,one}()`
- All methods returns a Promise
- Automatically defaults to Environment variables for DB config, that means you
  can also set your DB config via `process.env`
- Configures the client parser to parse postgres ints and numerics
  into javascript numbers (else `SELECT 1::int8` would return a string "1").
- Accepts String, Objects and connectionString for configuration,
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

## Example

``` javascript
const pgLazy = require('pg-lazy');
const url = 'postgres://user:pass@localhost:5432/my-db'
const { pool, sql, _raw, pg } = pgLazy(require('pg'), { connectionString:url },{ singleton:true });

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

Check more examples on the Test folder

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

  - psql -c 'create user lazy_test_user with password '"'lazy_test_pw'"';' -U postgres
  - psql -c 'create database lazy_test owner lazy_test_user;' -U postgres
  - psql -d lazy_test -c 'create table bars (n int not null);' -U lazy_test_user
  - psql -d lazy_test -c 'insert into bars (n) values (1), (2), (3);' -U lazy_test_user

Then run the tests:

    `yarn test` or `npm test`

## Changelog

[ChangeLog](https://github.com/uniibu/pg-Lazy/blob/master/CHANGELOG.md)

## Shouts

- Heavily inspired by [pg-extra](https://github.com/danneu/pg-extra).
