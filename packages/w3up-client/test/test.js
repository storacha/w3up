// import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import * as Context from '@web3-storage/upload-api/test/context'
// import * as Client from '@web3-storage/w3up-client'
import { memory } from '../src/store/memory.js'
import * as Agent from '../src/agent.js'
import * as assert from 'assert'
import * as API from '../src/types.js'

/**
 * @typedef {Omit<typeof assert, 'ok'> & {ok(value:unknown, message?:string):void}} Assert
 * @typedef {Record<string, (assert:Assert, context: Awaited<ReturnType<setup>>) => unknown>} Suite
 * @param {Suite|Record<string, Suite>} suite
 */
export const test = (suite) => {
  for (const [name, member] of Object.entries(suite)) {
    if (typeof member === 'function') {
      const define = name.startsWith('only ')
        ? it.only
        : name.startsWith('skip ')
        ? it.skip
        : it

      define(name, async () => {
        const context = await setup()
        try {
          await member(assert, context)
        } finally {
          await Context.cleanupContext(context)
        }
      })
    } else {
      describe(name, () => test(member))
    }
  }
}

const setupContext = async () => {
  const context = await Context.createContext({ assert })
  return Object.assign(context, {
    connection: Object.assign(context.connection, {
      address: {
        id: context.connection.id,
        url: context.url,
      },
    }),
  })
}

/**
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Connection<Protocol>} connection
 */
export const connect = (connection) =>
  Agent.open({
    store: memory(),
  }).connect(connection)

export const setup = async () => {
  const context = await setupContext()

  const { error, ok: session } = await connect(context.connection)
  if (error) {
    throw error
  }

  return { ...context, session }
}

/**
 * @typedef {Record<string, (assert:Assert) => unknown>} BasicSuite
 * @param {BasicSuite|Record<string, BasicSuite>} suite
 */
export const basic = (suite) => {
  for (const [name, member] of Object.entries(suite)) {
    if (typeof member === 'function') {
      const define = name.startsWith('only ')
        ? it.only
        : name.startsWith('skip ')
        ? it.skip
        : it

      define(name, async () => {
        await member(assert)
      })
    } else {
      describe(name, () => test(member))
    }
  }
}
