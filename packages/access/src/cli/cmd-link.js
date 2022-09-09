/* eslint-disable no-console */
import * as UCAN from '@ipld/dag-ucan'
import * as DID from '@ipld/dag-ucan/did'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Keypair from '@ucanto/authority'
import { Delegation } from '@ucanto/server'
import WS from 'isomorphic-ws'
import { nanoid } from 'nanoid'
import pWaitFor from 'p-wait-for'
import { Requestor } from '../awake/requestor.js'
import { Responder } from '../awake/responder.js'
import { identityIdentify } from '../capabilities.js'
import { getConfig } from './config.js'
import inquirer from 'inquirer'

/**
 * @param {string} channel
 * @param {{ profile: string; }} opts
 */
export async function linkCmd1(channel, opts) {
  const config = getConfig(opts.profile)
  console.log(config.get('did'))
  const done = false
  const id = channel || nanoid()
  const issuer = Keypair.parse(
    /** @type {string} */ (config.get('private-key'))
  )
  const ws = new WS('ws://127.0.0.1:8787/connect/' + id)
  if (!channel) {
    console.log('Link device with:', id)
  }
  ws.addEventListener('open', (event) => {
    if (channel) {
      ws.send(JSON.stringify({ type: 'did', message: config.get('did') }))
    }
  })
  ws.addEventListener('message', async (event) => {
    // @ts-ignore
    const data = JSON.parse(event.data)

    if (data.error) {
      console.error(data.error)
    }

    if (data.type === 'did') {
      console.log('generate delegation for', data.message)
      const delegation = await identityIdentify
        .invoke({
          audience: DID.parse(data.message),
          issuer,
          with: issuer.did(),
        })
        .delegate()
      ws.send(
        JSON.stringify({
          type: 'delegation',
          message: UCAN.format(delegation.data),
        })
      )
    }

    if (data.type === 'delegation') {
      const ucan = UCAN.parse(
        /** @type {UCAN.JWT<import('../capabilities-types').IdentityIdentify>} */ (
          data.message
        )
      )
      const root = await UCAN.write(ucan)
      /* @type {Types.Delegation<[import('../capabilities-types').IdentityIdentify]>} */
      const proof = Delegation.create({ root })
      console.log('Delegation:\n')
      console.log('Capabilities:', proof.capabilities)
      console.log('From:', proof.issuer.did())
    }
  })

  ws.addEventListener('close', (event) => {
    console.log('WebSocket closed, reconnecting:', event.code, event.reason)
  })
  ws.addEventListener('error', (event) => {
    console.log('WebSocket error, reconnecting:', event)
  })

  await pWaitFor(() => done)
}

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
  const done = false
  const host = new URL('ws://127.0.0.1:8787/connect')
  if (!channel) {
    const responder = await Responder.create(host, issuer)
    await responder.bootstrap()
    const { pin } = await inquirer.prompt({
      type: 'input',
      name: 'pin',
      message: 'Input your pin:',
    })

    responder.challenge(pin)
  } else {
    const requestor = await Requestor.create(host, issuer, channel)
    requestor.broadcastIntent([{ with: channel, can: 'identity/*' }])
  }

  await pWaitFor(() => done)
}
