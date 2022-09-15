const JSDOMEnvironment = require('jest-environment-jsdom')
const { TransformStream } = require('stream/web')
const { Blob, File } = require('@web-std/file')

// Extends the default JSDOMEnvironment to add globals that are present in all
// browsers and NodeJS that have not yet been added to the jsdom environment.
module.exports = class extends JSDOMEnvironment {
  constructor (config, options) {
    super(config, options)
    Object.assign(this.global, {
      TextEncoder,
      TextDecoder,
      TransformStream,
      Blob,
      File
    })
  }
}
