const path = require('path')
const { lstatSync, readdirSync } = require('fs')

// get listing of packages in the mono repo
const basePath = path.resolve(__dirname, 'packages')
const packages = readdirSync(basePath)
  .filter((name) => {
    return lstatSync(path.join(basePath, name)).isDirectory()
  })
  .sort((a, b) => b.length - a.length)

// node_modules that need babel transform e.g. because not export cjs
const esmodules = ['@ipld/unixfs', 'actor', 'multiformats'].join('|')

module.exports = {
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'text-summary'],
  projects: packages.map((d) => ({
    displayName: d,
    clearMocks: true,
    // testEnvironment: 'jsdom',
    testEnvironment: './jest.env.js',
    testMatch: [`<rootDir>/packages/${d}/**/*.test.[jt]s?(x)`],
    // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    snapshotFormat: {
      printBasicPrototype: false
    },
    transformIgnorePatterns: [`node_modules/(?!${esmodules})`]
  }))
}
