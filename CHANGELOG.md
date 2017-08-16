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