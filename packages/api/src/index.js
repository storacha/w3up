import { Router } from './utils/router.js'
import { getContext } from './utils/context.js'
import { HTTPError } from './utils/errors.js'
import { cors, postCors } from './utils/cors.js'
// import { Service } from './service.js'
import { version } from './routes/version.js'
import { notFound } from './utils/responses.js'
import { UcanRouter } from './utils/ucan-router.js'
import { access } from './abilities/access.js'

const r = new Router(getContext, {
  onError(req, err, ctx) {
    return HTTPError.respond(err, ctx)
  },
})

// CORS
r.add('options', '*', cors)

// Version
r.add('get', '/version', version, [postCors])

r.add('post', '/', async (event, ctx) => {
  const ucanRouter = new UcanRouter(ctx)
  ucanRouter.add('access', access)

  return await ucanRouter.route(event)
})

r.add('all', '*', notFound)
addEventListener('fetch', r.listen.bind(r))
