/* eslint-disable no-console */
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Keypair from '@ucanto/principal'
import inquirer from 'inquirer'
import pWaitFor from 'p-wait-for'
import { Agent } from '../agent.js'
import { Channel } from '../awake/channel.js'
import { Peer } from '../awake/peer.js'
import { EcdhKeypair } from '../crypto/p256-ecdh.js'
import { getConfig } from './config.js'
import * as Ed25519Signer from '../principal/signer-ed25519.js'

/**
 * @param {string} channel
 * @param {{ profile: string; }} opts
 */
export async function linkCmd(channel, opts) {
  const config = getConfig(opts.profile)
  const issuer = Ed25519Signer.parse(
    /** @type {string} */ (config.get('private-key'))
  )

  console.log('DID:', issuer.did())
  let done = false
  const host = new URL('ws://127.0.0.1:8788/connect')
  if (!channel) {
    const ws = await new Channel(
      host,
      issuer.did(),
      await EcdhKeypair.create()
    ).open()

    const agent = await Agent.generate(issuer)
    const responder = new Peer({ agent, channel: ws })
    await responder.awaitBootstrap()
    const { pin } = await inquirer.prompt({
      type: 'input',
      name: 'pin',
      message: 'Input your pin:',
    })

    await responder.ack(pin)
    await responder.awaitLink()

    config.set('agent', agent.export())
    done = true
  } else {
    const ws = await new Channel(
      host,
      channel,
      await EcdhKeypair.create()
    ).open()
    const agent = await Agent.generate(issuer)
    const requestor = new Peer({ agent, channel: ws })
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
    console.log('🚀 ~ file: cmd-link.js ~ line 70 ~ linkCmd ~ delegation', link)

    console.log(link)

    await agent.delegations.add(link.delegation)

    config.set('agent', agent.export())

    done = true
  }

  await pWaitFor(() => done)
}
