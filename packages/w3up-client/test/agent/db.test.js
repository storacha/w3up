import * as DB from '../../src/agent/db.js'
import * as Test from '../test.js'
import * as Space from '../../src/capability/space.js'
import * as Account from '../../src/view/account.js'
import { delegate } from '@ucanto/core'
import { Absentee, Verifier } from '@ucanto/principal'
import * as Capability from '@web3-storage/capabilities'
import { alice, bob, mallory, service } from '../fixtures/principals.js'

/**
 * @type {Test.BasicSuite}
 */
export const testDB = {
  'test find space': async (assert) => {
    const space = await Space.generate({
      name: 'beet-box',
    })
    const auth = await space.createAuthorization(alice)
    const db = DB.from({ proofs: [auth] })

    const result = DB.find(db, {
      can: { 'store/add': [] },
      audience: alice.did(),
    })

    assert.deepEqual(result, [
      {
        audience: alice.did(),
        subject: space.did(),
        proofs: [auth],
      },
    ])
  },

  'test find several spaces': async (assert) => {
    const beetBox = await Space.generate({
      name: 'beet-box',
    })
    const beetBoxAuth = await beetBox.createAuthorization(alice)

    const plumBox = await Space.generate({
      name: 'plum-box',
    })
    const plumBoxAuth = await plumBox.createAuthorization(alice)

    const db = DB.from({ proofs: [beetBoxAuth, plumBoxAuth] })

    const result = DB.find(db, {
      can: { 'store/add': [], 'store/remove': [] },
      audience: alice.did(),
    })

    assert.deepEqual(result, [
      {
        audience: alice.did(),
        subject: beetBox.did(),
        proofs: [beetBoxAuth],
      },
      {
        audience: alice.did(),
        subject: plumBox.did(),
        proofs: [plumBoxAuth],
      },
    ])
  },

  'test finds authorization across multiple ucans': async (assert) => {
    const spaceInfo = await Capability.Space.info.delegate({
      issuer: alice,
      audience: bob,
      with: alice.did(),
    })

    const uploadList = await Capability.Upload.list.delegate({
      issuer: alice,
      audience: bob,
      with: alice.did(),
    })

    const db = DB.from({ proofs: [spaceInfo, uploadList] })

    const result = DB.find(db, {
      can: { 'space/info': [], 'upload/list': [] },
      audience: bob.did(),
    })

    assert.deepEqual(result, [
      {
        audience: bob.did(),
        subject: alice.did(),
        proofs: [spaceInfo, uploadList],
      },
    ])
  },

  'test find accounts ignoring spaces': async (assert) => {
    const localSpace = await Space.generate({
      name: 'local-box',
    })
    const localAuth = await localSpace.createAuthorization(alice)

    const {
      login,
      attestation,
      account,
      space: remoteSpace,
    } = await setupAccount()

    const db = DB.from({
      proofs: [login, attestation, localAuth],
    })

    const result = DB.find(db, {
      subject: { like: 'did:mailto:%' },
      can: { '*': [] },
      audience: alice.did(),
    })

    assert.deepEqual(result, [
      {
        subject: account.did(),
        audience: alice.did(),
        proofs: [login],
      },
    ])

    const spaces = DB.find(db, {
      subject: { like: 'did:key:%' },
      can: { 'store/add': [] },
      audience: alice.did(),
    })

    assert.deepEqual(spaces, [
      {
        subject: remoteSpace.did(),
        audience: alice.did(),
        proofs: [login],
      },
      {
        subject: localSpace.did(),
        audience: alice.did(),
        proofs: [localAuth],
      },
    ])
  },

  'test find accounts and attestations': async (assert) => {
    const { login, attestation, account } = await setupAccount()

    const db = DB.from({ proofs: [login, attestation] })

    const loginProof = DB.link()
    const loginCan = DB.link()
    const attestProof = DB.link()
    const attestCan = DB.link()

    const result = DB.query(db.index, {
      select: {
        loginProof,
        attestProof,
      },
      where: [
        DB.match([loginProof, 'ucan/audience', alice.did()]),
        DB.match([loginProof, 'ucan/capability', loginCan]),
        DB.match([loginCan, 'capability/with', account.did()]),

        DB.match([attestProof, 'ucan/audience', alice.did()]),
        DB.match([attestProof, 'ucan/capability', attestCan]),
        DB.match([attestCan, 'capability/can', 'ucan/attest']),
        DB.match([attestCan, 'capability/nb/proof', loginProof]),
      ],
    })

    assert.deepEqual(result, [
      {
        loginProof: login.cid,
        attestProof: attestation.cid,
      },
    ])
  },

  'does not match expired ucans': async (assert) => {
    const space = await Space.generate({ name: 'space' })
    const time = (Date.now() / 1000) | 0
    const expired = await space.createAuthorization(alice, {
      expiration: time - 60 * 60 * 24,
    })

    const valid = await space.createAuthorization(alice, {
      expiration: time + 60 * 60 * 24,
    })

    const db = DB.from({
      proofs: [valid, expired],
    })

    const withoutExpired = DB.find(db, {
      can: { 'store/add': [] },
      audience: alice.did(),
      time,
    })

    assert.deepEqual(withoutExpired, [
      {
        audience: alice.did(),
        subject: space.did(),
        proofs: [valid],
      },
    ])

    const withExpired = DB.find(db, {
      can: { 'store/add': [] },
      audience: alice.did(),
      time: time - 60 * 60 * 24 * 2,
    })

    assert.deepEqual(withExpired, [
      {
        audience: alice.did(),
        subject: space.did(),
        proofs: [valid],
      },
      {
        audience: alice.did(),
        subject: space.did(),
        proofs: [expired],
      },
    ])
  },

  'does match non-expiring ucans': async (assert) => {
    const space = await Space.generate({ name: 'space' })
    const proof = await space.createAuthorization(alice, {
      expiration: Infinity,
    })

    const db = DB.from({
      proofs: [proof],
    })

    const result = DB.find(db, {
      can: { 'store/add': [] },
      audience: alice.did(),
    })

    assert.deepEqual(result, [
      {
        audience: alice.did(),
        subject: space.did(),
        proofs: [proof],
      },
    ])
  },
}

const setupAccount = async () => {
  const space = await Space.generate({ name: 'stuff' })
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })

  const recovery = await space.createRecovery(account.did())
  const login = await delegate({
    issuer: account,
    audience: alice,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
      },
    ],
    proofs: [recovery],
  })

  const attestation = await Capability.UCAN.attest.delegate({
    issuer: service,
    audience: alice,
    with: service.did(),
    nb: { proof: login.cid },
    expiration: Infinity,
  })

  return { space, account, recovery, login, attestation }
}

Test.basic({ DB: testDB })
