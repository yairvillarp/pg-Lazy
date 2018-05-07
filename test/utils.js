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
