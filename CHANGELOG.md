### Major Update and Breaking Changes v2.0.0 May 7, 2018
* No longer mutates pg.Pool and pg.Client
* Uses es6 `class extends`
* Does not directly extends pg.Pool, instead requires `pg-pool` and extends it.
* It extends pg.Pool and pg.Client with the helpers and put them on pg._Pool and pg._Client.
* No longer automatically initializes Pool, a third argument with {singleton:true} is required to auto initiaze and returns `pool`
  Otherwise, it does not return `pool`, and you must initialize it your self.
* Errors are now an instance of `PgLazyError`
* Configuration now accepts String and Object. String configurations are treated as a connectionString.
* If no configuration is passed, uses Environment variables if available, otherwise it throws.
* Code modularization
* Sql statement minification using `pg-minify`
* Change unit test from `Jest` to `Mocha` and `Chai`
* Added nyc for coverage testing
* Change standard to semistandard
* Replace `npm` with `yarn`

### Minor Patch v1.0.3 - v1.0.4 Aug 17, 2017
* Fix one method to allow less than 1 result

### Minor Patch v1.0.2 Aug 17, 2017
* Removed `timertask` that used to call a function given and returns the `pool.totalCount, pool.idleCount, pool.waitingCount`
  Since those are still exposed via pg, let the user call them if needed.
* Added `await pool.isConnected()` and `await client.isConnected()`
  This returns a Boolean(true,false) if the pool/client is able to connect successfully to the given configuration
* Make helpers more stricter, will throw if conditions are not met
* Change test module from Ava to Jest
* Added Standard badge
* Change engine spec to Node `^7.10.1 || >= 8.1.4`
* Added Sanity check before exporting. Will throw if Node or Pg versions mismatch
* Added more test

### Minor Patch v1.0.1 Aug 16, 2017
* Fix Badges on README.md
* Added Greenkeeper

### Initial commit v1.0.0 Aug 16, 2017