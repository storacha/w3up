import { Space } from '@storacha/capabilities'
import * as Provider from '@ucanto/server'
import * as API from './types.js'

import { info } from './space/info.js'
import { createService as createBlobService } from './blob.js'
import { createService as createIndexService } from './index.js'

/**
 * @param {API.SpaceServiceContext & API.BlobServiceContext & API.IndexServiceContext} ctx
 */
export const createService = (ctx) => ({
  info: Provider.provide(Space.info, (input) => info(input, ctx)),
  blob: createBlobService(ctx),
  index: createIndexService(ctx),
})
