/* eslint-disable no-console */
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Keypair from '@ucanto/authority'
import pWaitFor from 'p-wait-for'
import { Requestor } from '../awake/requestor.js'
import { Responder } from '../awake/responder.js'
import { getConfig } from './config.js'
import inquirer from 'inquirer'
import { Channel } from '../awake/channel.js'
import { EcdhKeypair } from '../crypto/p256-ecdh.js'

/**
 * @param {string} channel
 * @param {{ profile: string; }} opts
 */
export async function linkCmd(channel, opts) {
  const config = getConfig(opts.profile)
  const issuer = Keypair.parse(
    /** @type {string} */ (config.get('private-key'))
  )

  console.log('DID:', issuer.did())
  let done = false
  const host = new URL('ws://127.0.0.1:8788/connect')
  if (!channel) {
    const ws = new Channel(host, issuer.did(), await EcdhKeypair.create())
    const responder = await Responder.create(issuer, ws)
    await responder.bootstrap()
    const { pin } = await inquirer.prompt({
      type: 'input',
      name: 'pin',
      message: 'Input your pin:',
    })

    responder.ack(pin)
  } else {
    const ws = new Channel(host, channel, await EcdhKeypair.create())
    const requestor = await Requestor.create(issuer, ws)
    const pin = await requestor.bootstrap([
      { with: channel, can: 'identity/*' },
    ])

    console.log(pin)
    const delegation = await requestor.link()
    config.set('delegation', delegation)

    done = true
  }

  await pWaitFor(() => done)
}
