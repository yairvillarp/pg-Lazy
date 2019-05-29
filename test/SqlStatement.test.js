/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions */
const { sql, _raw } = require('../src/lib/SqlStatement');
const { expect } = require('chai');
const minify = require('pg-minify');
describe('Interpolation', () => {
  it('works', () => {
    const statement = sql`SELECT 1`;
    expect(statement.text).to.equal('SELECT 1');
    expect(statement.values).to.eql([]);
  });
  it('interpolates one binding', () => {
    const statement = sql`SELECT ${42}::int`;
    expect(statement.text).to.equal('SELECT $1::int');
    expect(statement.values).to.eql([42]);
  });

  it('interpolates multiple bindings', () => {
    const statement = sql`
     SELECT *
     FROM users
     WHERE lower(uname) = lower(${'foo'})
       AND num = ANY (${[1, 2, 3]})
  `;

    expect(statement.text).to.equal(minify(`
     SELECT *
     FROM users
     WHERE lower(uname) = lower($1)
       AND num = ANY ($2)
  `));

    expect(statement.values).to.eql(['foo', [1, 2, 3]]);
  });
});
// =========================================================
describe('Append', () => {
  it('append() adds a space', () => {
    expect(sql`a`.append(_raw`b`).text).to.equal('a b');
  });
  it('append() adds nothing', () => {
    expect(sql`a`.append('').text).to.equal('a');
  });
  it('append(sql) pads as expected', () => {
    expect(sql`SELECT ${42}::int`.append(sql`+${43}-`).text).to.equal('SELECT $1::int +$2-');
    expect(sql`SELECT ${42}::int`.append(sql`+${43}`).text).to.equal('SELECT $1::int +$2');
    expect(sql`SELECT ${42}::int`.append(sql`${43}-`).text).to.equal('SELECT $1::int $2-');
    expect(sql`SELECT ${42}::int`.append(sql``).text).to.equal('SELECT $1::int');
  });

  it('append(sql) does affect values', () => {
    const stmt = sql`SELECT ${42}::int`.append(sql`${43}`);
    expect(stmt.values).to.eql([42, 43]);
    expect(stmt.text).to.equal('SELECT $1::int $2');
  });

  it('append(_raw) does not affect values', () => {
    const stmt = sql`SELECT ${42}::int`.append(_raw`${42}`);
    expect(stmt.text).to.equal('SELECT $1::int 42');
  });

  it('append(_raw) pads as expected', () => {
    expect(sql`SELECT ${42}::int`.append(_raw`+${43}-`).text).to.equal('SELECT $1::int +43-');
    expect(sql`SELECT ${42}::int`.append(_raw`+${43}`).text).to.equal('SELECT $1::int +43');
    expect(sql`SELECT ${42}::int`.append(_raw`${43}-`).text).to.equal('SELECT $1::int 43-');
    expect(sql`SELECT ${42}::int`.append(_raw``).text).to.equal('SELECT $1::int');
  });

  it('append() can be chained', () => {
    const stmt = sql`SELECT ${42}::int`.append(_raw`${43}`).append(sql`${44}`).append(_raw`${45}`);

    expect(stmt.text).to.equal('SELECT $1::int 43 $2 45');
    expect(stmt.values).to.eql([42, 44]);
  });
});
