// a public sample database

if (process.env.TRAVIS) {
  module.exports = {
    connectionString: 'postgres://lazy_test_user:lazy_test_pw@localhost:5432/lazy_test',
    connectionObject: {
      user: 'lazy_test_user',
      host: 'localhost',
      database: 'lazy_test',
      password: 'lazy_test_pw',
      port: 5432
    },
    queryError: /must build query with sql or _raw/
  };
} else {
  module.exports = {
    connectionString: {
      client: 'postgres://tvsfucky:aTl1qCqVcAHcrDsFyYiiZmJsi0SAUHP0@drona.db.elephantsql.com:5432/tvsfucky',
      pool: 'postgres://cnweanfy:jFaboCRZ6ZR27de0vprgKKGECbrm_KrS@drona.db.elephantsql.com:5432/cnweanfy'
    },
    connectionObject: {
      user: 'tvsfucky',
      host: 'drona.db.elephantsql.com',
      database: 'tvsfucky',
      password: 'aTl1qCqVcAHcrDsFyYiiZmJsi0SAUHP0',
      port: 5432
    },
    queryError: /must build query with sql or _raw/
  };
}
