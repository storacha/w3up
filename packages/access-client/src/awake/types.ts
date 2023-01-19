import * as UCAN from '@ipld/dag-ucan'
import { Ability, Resource } from '@ipld/dag-ucan'
import WS from 'isomorphic-ws'
import { z } from 'zod'
import { KeyExchangeKeypair } from '../crypto/types.js'
import { Handler } from './channel.js'
import * as Messages from './messages.js'

export interface Channel {
  keypair: KeyExchangeKeypair

  ws?: WebSocket | WS
  /**
   * Sends a data as a message
   * Data should run through JSON.stringify
   */
  send: (data: unknown) => void
  open: () => Promise<Channel>
  close: (code?: number, reason?: string) => Promise<Channel>
  subscribe: (type: MessageType, fn: Handler, once?: boolean) => () => void

  /**
   * Send awake init message to responder
   * did - The Requestor's initial (temp) ECDH P-256
   *
   * @param caps - Capabilities that the Responder MUST provide
   */
  sendInit: (caps: AwakeInit['caps']) => Promise<void>

  awaitInit: () => Promise<AwakeInit>

  /**
   * Send awake res message to requestor
   *
   * @param aud - The ECDH P-256 DID signalled by the Requestor in previous awake/init
   * @param ucan - Validation UCAN to be AES-GCM-encrypted
   */
  sendRes: (aud: UCAN.Principal, msg: UCAN.View) => Promise<void>

  /**
   * Awaits for awake/res msg and decrypts ucan payload from send DID
   */
  awaitRes: () => Promise<AwakeRes>

  /**
   * Send generic awake/msg with encrypted payload and message id
   *
   * @param did - DID to encrypt for
   * @param msg - Message to be encrypted and sent
   */
  sendMsg: (did: UCAN.Principal, msg: unknown) => Promise<void>

  /**
   * Awaits for a awake/msg and decrypts payload from sender DID
   */
  awaitMsg: (
    did: UCAN.Principal
  ) => Promise<import('./types').AwakeMsgDecrypted>

  sendFin: (did: UCAN.Principal) => Promise<void>
}

export type MessageType = z.infer<(typeof Messages)['MessageType']>

export type AwakeMessage = z.infer<(typeof Messages)['AwakeMessage']>

export interface AwakeInit extends AwakeMessage {
  did: UCAN.Principal
  caps: UCAN.Capabilities
}

export interface AwakeRes extends AwakeMessage {
  iss: UCAN.Principal
  aud: UCAN.Principal
  ucan: UCAN.View
}

/**
 * Awake message with encrypted payload
 */
export interface AwakeMsg extends AwakeMessage {
  id: string
  msg: string
}

/**
 * Awake message with decrypted payload
 */
export interface AwakeMsgDecrypted extends AwakeMessage {
  id: string
  msg: any
}

export type PinChallengeMessage = z.infer<
  (typeof Messages)['PinChallengeMessage']
> & {
  did: `did:${string}`
}

declare const Marker: unique symbol
export interface Phantom<T> {
  [Marker]?: T
}

export type Encrypted<In, Out extends string = string> = Out & Phantom<In>

export interface PeerMeta {
  name: string
  description?: string
  url?: URL
  image?: URL
  type: 'device' | 'app' | 'service'
}

export interface LinkRequest extends AwakeMsgDecrypted {
  msg: {
    type: 'link'
    meta: PeerMeta
    caps: Array<{
      can: Ability
      with?: Resource
    }>
  }
}

export interface LinkResponse extends AwakeMsgDecrypted {
  msg: {
    meta: PeerMeta
    delegation: string
  }
}

export type MetaMap = Map<string, PeerMeta>
