/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-console */
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import inquirer from 'inquirer'
import pWaitFor from 'p-wait-for'
import { Agent } from '../agent.js'
import { Channel } from '../awake/channel.js'
import { EcdhKeypair } from '../crypto/p256-ecdh.js'
import { StoreConf } from '../stores/store-conf.js'
import { getService } from './utils.js'

/**
 * @param {string} channel
 * @param {{ profile: string; env: string }} opts
 */
export async function cmdLink(channel, opts) {
  const { url } = await getService(opts.env)
  const store = new StoreConf({ profile: opts.profile })
  const data = await store.load()

  if (!data) {
    console.error('run setup first')
    process.exit(1)
  }

  const agent = Agent.from(data, { store, url })

  console.log('DID:', agent.did())
  let done = false
  const host = new URL('ws://127.0.0.1:8788/connect')
  if (channel) {
    const ws = await new Channel(
      host,
      channel,
      await EcdhKeypair.create()
    ).open()
    const requestor = agent.peer(ws)
    const pin = await requestor.bootstrap([
      // @ts-ignore
      { with: channel, can: 'identity/*' },
    ])

    console.log(pin)
    await requestor.awaitAck()
    const link = await requestor.link({
      caps: [{ can: 'identity/*' }],
      meta: {
        name: agent.did(),
        type: 'device',
      },
    })

    console.log(link)

    done = true
  } else {
    const ws = await new Channel(
      host,
      agent.did(),
      await EcdhKeypair.create()
    ).open()

    const responder = agent.peer(ws)
    await responder.awaitBootstrap()
    const { pin } = await inquirer.prompt({
      type: 'input',
      name: 'pin',
      message: 'Input your pin:',
    })

    await responder.ack(pin)
    await responder.awaitLink()

    done = true
  }

  await pWaitFor(() => done)
}
