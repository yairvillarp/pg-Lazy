const SqlStatement = require('./SqlStatement');
const { one, many } = require('./Methods');
class Prepared {
  constructor (name, toQuery) {
    this.name = name;
    this.toQuery = toQuery;
  }
  async query (statement) {
    SqlStatement.check(statement);
    return this.toQuery(statement.named(this.name));
  }
}
Prepared.prototype.one = one;
Prepared.prototype.many = many;

module.exports = Prepared;
