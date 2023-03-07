import * as Sentry from '@sentry/serverless'
import { createService as createServiceRouter, createServer } from './lib.js'

Sentry.AWSLambda.init({
  environment: process.env.SST_STAGE,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})

export { createServiceRouter }

/**
 * @param {import('@ucanto/interface').Signer} servicePrincipal
 * @param {import('./types').UcantoServerContext} context
 */
export const createUcantoServer = (servicePrincipal, context) =>
  createServer({
    ...context,
    id: servicePrincipal,
    errorReporter: {
      catch: (/** @type {string | Error} */ err) => {
        // eslint-disable-next-line no-console
        console.warn(err)
        Sentry.AWSLambda.captureException(err)
      },
    },
  })
