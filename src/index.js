const resolve = require('path').resolve
const nodeV = process.version

const majorNodeV = Number.parseInt(nodeV.split('.').shift().replace(/[^0-9.]/g, ''))
if (majorNodeV < 7) {
  throw new Error(
        [
          '[pgLazy:Error] Node version mismatch.',
          `Installed: ${nodeV}`,
          'Required: ^7.10.1 || >= 8.1.4',
          'Please install the latest node version'
        ].join('\n')
    )
}
const rootpkg = resolve(process.cwd(), './package.json')
const { dependencies, devDependencies } = require(rootpkg)
const pgmod = dependencies.pg || devDependencies.pg

if (!pgmod) {
  throw new Error(['[pgLazy:Error]', 'node-postgres is missing from package.json'].join('\n'))
}

const majorV = Number.parseInt(pgmod.split('.').shift().replace(/[^0-9.]/g, ''))
if (majorV < 7) {
  throw new Error(['[pgLazy:Error]', 'node-postgres mismatch, please install the latest node-postgres'].join('\n'))
}

module.exports = require('./pgLazy')
