import { DID, Principal, Signer, ConnectionView, Result, UnknownLink, Failure, Unit } from '@ucanto/interface'
import { BlockFetcher, EntriesOptions } from '@web3-storage/pail/api'
import { EventLink } from '@web3-storage/pail/clock/api'
import { Operation } from '@web3-storage/pail/crdt/api'
import { AdvanceOptions } from '@web3-storage/clock/client/api'
import { ClockService } from '@web3-storage/clock/api'
import { Agent } from '@web3-storage/access'

export type {
  DID,
  Principal,
  Signer,
  ConnectionView,
  Result,
  BlockFetcher,
  EntriesOptions,
  EventLink,
  Operation,
  AdvanceOptions,
  Agent,
  ClockService
}

/** A merkle clock. */
export interface Clock<T> extends Principal {
  /** Retrieve the head event(s) of the clock. */
  head (): Promise<Result<EventLink<T>[]>>
  /** Advance the clock by adding an event. */
  advance (event: EventLink<T>, options?: AdvanceOptions<T>): Promise<Result<EventLink<T>[]>>
}

/** A merkle clock that is not local. */
export interface RemoteClock<T> extends Clock<T> {
  /** Service URL for the clock. */
  url: URL
}

/** A merkle clock networked with other clocks. */
export interface NetworkClock<T> extends Clock<T> {
  /** Remote clocks this clock can sync with. */
  remotes: Record<DID, RemoteClock<T>>
  /** Add a remote clock. */
  addRemote (id: Principal, url: URL): void
  /** Remove a remote clock. */
  removeRemote (id: Principal): void
}

export interface KeyNotFound extends Failure {
  name: 'KeyNotFound'
}

export interface Pail {
  put (key: string, value: UnknownLink): Promise<Result<Unit>>
  get (key: string): Promise<Result<UnknownLink, KeyNotFound>>
  del (key: string): Promise<Result<Unit>>
  entries (options?: EntriesOptions): AsyncIterableIterator<Result<[string, UnknownLink]>>
}

export interface NetworkPail extends Pail {
  clock: NetworkClock<Operation>
}
