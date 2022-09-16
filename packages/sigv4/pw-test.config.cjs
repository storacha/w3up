const path = require('path')
const dotenv = require('dotenv')

dotenv.config({
  path: path.join(__dirname, '../../.env'),
})

/** @type {import('playwright-test').RunnerOptions} */
module.exports = {
  buildConfig: {
    define: {
      S3_ACCESS_KEY_ID: JSON.stringify(process.env.S3_ACCESS_KEY_ID),
      S3_SECRET_ACCESS_KEY: JSON.stringify(process.env.S3_SECRET_ACCESS_KEY),
      S3_BUCKET: JSON.stringify(process.env.S3_BUCKET),
    },
  },
}
