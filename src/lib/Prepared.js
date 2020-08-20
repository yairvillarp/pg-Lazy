const SqlStatement = require('./SqlStatement');
const { check } = require('../utils');
class Prepared {
  constructor (name, toQuery) {
    this.name = name;
    this.toQuery = toQuery;
  }

  async query (statement) {
    SqlStatement.check(statement);
    return this.toQuery(statement.named(this.name));
  }

  async many (sql, params) {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async one (sql, params) {
    const result = await this.query(sql, params);
    check(result.rowCount > 1, 'one() result has more than one row, use many() instead');
    return result.rows[0];
  }
}

module.exports = Prepared;
