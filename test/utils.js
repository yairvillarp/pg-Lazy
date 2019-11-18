// a public sample database
if(process.NODE_ENV == 'travis') {
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
  }
}else {
  module.exports = {
    connectionString: 'postgres://tojrrrso:demc16cCK1w9MOJavZY6GEoDe-kj9y36@raja.db.elephantsql.com:5432/tojrrrso',
    connectionObject: {
      user: 'tojrrrso',
      host: 'raja.db.elephantsql.com',
      database: 'tojrrrso',
      password: 'demc16cCK1w9MOJavZY6GEoDe-kj9y36',
      port: 5432
    },
    queryError: /must build query with sql or _raw/
  };
}