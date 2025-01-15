import * as Server from '@ucanto/server/server'

import * as Client from '@ucanto/client'
import { Message } from '@ucanto/core'
import * as Types from './types.js'
import * as Legacy from '@ucanto/transport/legacy'
import * as CAR from '@ucanto/transport/car'
import { create as createRevocationChecker } from './utils/revocation.js'
import { createService as createUploadService } from './upload.js'
import { createService as createConsoleService } from './console.js'
import { createService as createAccessService } from './access.js'
import { createService as createConsumerService } from './consumer.js'
import { createService as createCustomerService } from './customer.js'
import { createService as createSpaceService } from './space.js'
import { createService as createProviderService } from './provider.js'
import { createService as createSubscriptionService } from './subscription.js'
import { createService as createAdminService } from './admin.js'
import { createService as createRateLimitService } from './rate-limit.js'
import { createService as createUcanService } from './ucan.js'
import { createService as createPlanService } from './plan.js'
import { createService as createUsageService } from './usage.js'
import { createService as createFilecoinService } from '@storacha/filecoin-api/storefront/service'
import { createService as createLegacyAdminService } from '@web3-storage/upload-api/admin'
import { createService as createLegacyStoreService } from '@web3-storage/upload-api/store'
import * as AgentMessage from './utils/agent-message.js'

export * from './types.js'
export { AgentMessage }

/**
 * @param {Omit<Types.UcantoServerContext, 'validateAuthorization'>} options
 * @returns {Agent<Types.Service>}
 */
export const createServer = ({ codec = Legacy.inbound, ...options }) => {
  const context = {
    ...options,
    ...createRevocationChecker(options),
  }

  const server = Server.create({
    ...context,
    codec,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
  })

  /**
   * @type {Types.ServerView<Types.Service>['request']}
   */
  const request = (request) => handle(agent, request)

  const agent = /** @type {Agent<Types.Service>} */ ({
    ...server,
    id: server.id,
    context: { ...server.context, ...context },
    request,
  })

  return agent
}

/**
 * @typedef {object} WithContext
 * @property {Types.AgentContext} context
 */
/**
 * @template {Record<string, any>} S
 * @typedef {Types.Server<S> & Types.ErrorReporter & WithContext & Types.Transport.Channel<S>} Agent
 */

/**
 * @template {Record<string, any>} S
 * @template {Types.Tuple<Types.ServiceInvocation<Types.Capability, S>>} I
 * @param {Agent<S>} agent
 * @param {Types.HTTPRequest<Types.AgentMessage<{ In: Types.InferInvocations<I>, Out: Types.Tuple<Types.Receipt> }>>} request
 * @returns {Promise<Types.HTTPResponse<Types.AgentMessage<{ Out: Types.InferReceipts<I, S>, In: Types.Tuple<Types.Invocation> }>>>}
 */
export const handle = async (agent, request) => {
  const selection = agent.codec.accept(request)
  if (selection.error) {
    const { status, headers = {}, message } = selection.error
    return {
      status,
      headers,
      body: new TextEncoder().encode(message),
    }
  } else {
    const { encoder, decoder } = selection.ok
    const input = await decoder.decode(request)

    // Save invocation inside agent store so we can find it later. If we fail
    // to save it we return 500 as we do not want to run the invocation that
    // we are unable to service.
    const save = await agent.context.agentStore.messages.write({
      data: input,
      source: request,
      index: AgentMessage.index(input),
    })

    if (save.error) {
      return {
        status: 500,
        headers: {},
        body: new TextEncoder().encode(`Server error: ${save.error.message}`),
      }
    }

    const output = await execute(agent, input)
    const response = await encoder.encode(output)

    const { error } = await agent.context.agentStore.messages.write({
      data: output,
      source: response,
      index: AgentMessage.index(output),
    })

    // Failure to write a receipt is not something we can recover from. Throwing
    // or returning HTTP 500 is also a not a great option because invocation may
    // have change state and we would not want to rerun it. Which is why we
    // report an error but return a message back.
    if (error) {
      agent.catch(error)
    }

    return response
  }
}

/**
 * @template {Record<string, any>} S
 * @template {Types.Tuple} I
 * @param {Agent<S>} agent
 * @param {Types.AgentMessage<{ In: Types.InferInvocations<I>, Out: Types.Tuple<Types.Receipt> }>} input
 * @returns {Promise<Types.AgentMessage<{ Out: Types.InferReceipts<I, S>, In: Types.Tuple<Types.Invocation> }>>}
 */
export const execute = async (agent, input) => {
  const promises = input.invocations.map(($) => run(agent, $))
  const receipts = /** @type {Types.InferReceipts<I, S>} */ (
    await Promise.all(promises)
  )

  return Message.build({ receipts })
}

/**
 * Runs given invocation unless agent already has a receipt, if agent does have
 * a receipt it will return receipt without running invocation.
 *
 * @template {Record<string, any>} S
 * @param {Agent<S>} agent
 * @param {Types.Invocation} invocation
 */
export const run = async (agent, invocation) => {
  const cached = await agent.context.agentStore.receipts.get(invocation.link())
  if (cached.ok) {
    return cached.ok
  }

  // ucanto does not actually requires use of ServerView
  /** @type {Types.ServerView<S>} */
  const server = /** @type {any} */ (agent)

  // ⚠️ There might be a race condition if we received two concurrent requests
  // with a same invocation. Second one will not find a receipt if first one
  // is still in flight. Looking up whether we have invocation is also not
  // going to help because race might happen after that is first one may write
  // record invocation status after we lookup proper solution is to use FIFO
  // queue which we hope to introduce with a scheduler.
  return await Server.invoke(invocation, server)
}

/**
 * @param {Types.ServiceContext} context
 * @returns {Types.Service}
 */
export const createService = (context) => ({
  access: createAccessService(context),
  console: createConsoleService(context),
  consumer: createConsumerService(context),
  customer: createCustomerService(context),
  provider: createProviderService(context),
  'rate-limit': createRateLimitService(context),
  admin: {
    ...createAdminService(context),
    // @ts-expect-error `uploadTable` items now have a `cause` field. This does
    // not matter since `admin/store/inspect` handler does not use this table.
    store: createLegacyAdminService(context).store
  },
  space: createSpaceService(context),
  subscription: createSubscriptionService(context),
  upload: createUploadService(context),
  ucan: createUcanService(context),
  plan: createPlanService(context),
  // storefront of filecoin pipeline
  filecoin: createFilecoinService(context).filecoin,
  usage: createUsageService(context),
  // legacy
  store: createLegacyStoreService(context),
})

/**
 * @param {object} options
 * @param {Types.Principal} options.id
 * @param {Types.Transport.Channel<Types.Service>} options.channel
 * @param {Types.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

export {
  createService as createUploadService,
  createServer as createUploadServer,
  connect as createUploadClient,
}
