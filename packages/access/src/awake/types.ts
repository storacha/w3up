import * as UCAN from '@ipld/dag-ucan'
import { z } from 'zod'
import { KeyExchangeKeypair } from '../crypto/types.js'
import * as Messages from './messages.js'

export interface Channel {
  keypair: KeyExchangeKeypair
  /**
   * Sends a data as a message
   * Data should run through JSON.stringify
   */
  send: (data: unknown) => Promise<void>
  close: (code: number, reason: string) => void

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
  sendRes: (aud: UCAN.DIDView, msg: UCAN.View) => Promise<void>

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
  sendMsg: (did: UCAN.DIDView, msg: unknown) => void

  /**
   * Awaits for a awake/msg and decrypts payload from sender DID
   */
  awaitMsg: (did: UCAN.DIDView) => Promise<import('./types').AwakeMsgDecrypted>
}

export type MessageType = z.infer<typeof Messages['MessageType']>

export interface AwakeMessage {
  awv: string
  type: string
}

export interface AwakeInit extends AwakeMessage {
  did: UCAN.DIDView
  caps: UCAN.Capabilities
}

export interface AwakeRes extends AwakeMessage {
  iss: UCAN.DIDView
  aud: UCAN.DIDView
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
  msg: unknown
}

export type PinChallengeMessage = z.infer<
  typeof Messages['PinChallengeMessage']
> & {
  did: `did:${string}`
}
