import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import { Context } from '@web3-storage/upload-api/test'
import * as Client from '@web3-storage/w3up-client'
import * as assert from 'assert'

/* eslint-disable jsdoc/no-undefined-types */
/**
 * @typedef {Omit<typeof assert, 'ok'> & {ok(value:unknown, message?:string):void}} Assert
 * @typedef {Record<string, (assert:Assert, context: Awaited<ReturnType<setup>>) => unknown>} Suite
 * @param {Suite|Record<string, Suite>} suite
 */
export const test = (suite) => {
  for (const [name, member] of Object.entries(suite)) {
    if (typeof member === 'function') {
      // eslint-disable-next-line no-nested-ternary
      const define = name.startsWith('only ')
        ? // eslint-disable-next-line no-only-tests/no-only-tests
          it.only
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
      test(member)
    }
  }
}

export const setup = async () => {
  const context = await Context.createContext()

  const client = await Client.create({
    store: new StoreMemory(),
    serviceConf: {
      access: context.connection,
      upload: context.connection,
    },
  })

  return { ...context, client }
}
