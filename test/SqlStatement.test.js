const { sql, _raw } = require('../src/SqlStatement')

describe('Interpolation', () => {
  test('works', () => {
    const statement = sql`SELECT 1`
    expect(statement.text).toEqual('SELECT 1')
    expect(statement.values).toEqual([])
  })

  test('interpolates one binding', () => {
    const statement = sql`SELECT ${42}::int`
    expect(statement.text).toEqual('SELECT $1::int')
    expect(statement.values).toEqual([42])
  })

  test('interpolates multiple bindings', () => {
    const statement = sql`
     SELECT *
     FROM users
     WHERE lower(uname) = lower(${'foo'})
       AND num = ANY (${[1, 2, 3]})
  `

    expect(statement.text).toBe(`
     SELECT *
     FROM users
     WHERE lower(uname) = lower($1)
       AND num = ANY ($2)
  `)

    expect(statement.values).toEqual(['foo', [1, 2, 3]])
  })
})
// =========================================================
describe('Append', () => {
  test('append() adds a space', () => {
    expect(sql`a`.append(_raw`b`).text).toEqual('a b')
  })

  test('append(sql) pads as expected', () => {
    expect(sql`SELECT ${42}::int`.append(sql`+${43}-`).text).toEqual('SELECT $1::int +$2-')
    expect(sql`SELECT ${42}::int`.append(sql`+${43}`).text).toEqual('SELECT $1::int +$2')
    expect(sql`SELECT ${42}::int`.append(sql`${43}-`).text).toEqual('SELECT $1::int $2-')
    expect(sql`SELECT ${42}::int`.append(sql``).text).toEqual('SELECT $1::int ')
  })

  test('append(sql) does affect values', () => {
    const stmt = sql`SELECT ${42}::int`.append(sql`${43}`)
    expect(stmt.values).toEqual([42, 43])
    expect(stmt.text).toEqual('SELECT $1::int $2')
  })

  test('append(_raw) does not affect values', () => {
    const stmt = sql`SELECT ${42}::int`.append(_raw`${42}`)
    expect(stmt.text).toEqual('SELECT $1::int 42')
  })

  test('append(_raw) pads as expected', () => {
    expect(sql`SELECT ${42}::int`.append(_raw`+${43}-`).text).toEqual('SELECT $1::int +43-')
    expect(sql`SELECT ${42}::int`.append(_raw`+${43}`).text).toEqual('SELECT $1::int +43')
    expect(sql`SELECT ${42}::int`.append(_raw`${43}-`).text).toEqual('SELECT $1::int 43-')
    expect(sql`SELECT ${42}::int`.append(_raw``).text).toEqual('SELECT $1::int ')
  })

  test('append() can be chained', () => {
    const stmt = sql`SELECT ${42}::int`.append(_raw`${43}`).append(sql`${44}`).append(_raw`${45}`)

    expect(stmt.text).toEqual('SELECT $1::int 43 $2 45')
    expect(stmt.values).toEqual([42, 44])
  })
})
