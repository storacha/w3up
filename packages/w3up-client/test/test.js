import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import * as Context from '@web3-storage/upload-api/test/context'
import * as Client from '@web3-storage/w3up-client'
import * as assert from 'assert'
import * as http from 'http'

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

export const setup = async () => {
  const context = await Context.createContext({
    http,
    assert,
  })

  const connect = () =>
    Client.create({
      store: new StoreMemory(),
      serviceConf: {
        access: context.connection,
        upload: context.connection,
        filecoin: context.connection,
      },
    })

  return { ...context, connect, client: await connect() }
}
