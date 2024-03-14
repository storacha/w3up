import * as API from '../src/types.js'
import * as DB from '../src/agent/db.js'
import * as Test from './test.js'
import * as Space from '../src/space.js'
import * as Spaces from '../src/space/query.js'
import * as Account from '../src/account/query.js'
import { delegate } from '@ucanto/core'
import { Absentee } from '@ucanto/principal'
import * as Capability from '@web3-storage/capabilities'
import { fromEmail } from '@web3-storage/did-mailto'
import * as Result from '../src/result.js'
import * as Task from '../src/task.js'
import * as W3Up from '../src/w3up.js'

import { alice, bob, mallory, w3up } from './fixtures/principals.js'
import * as Authorization from '../src/authorization.js'

/**
 * @type {Test.BasicSuite}
 */
export const testDB = {
  'test find space': (assert) =>
    Task.spawn(function* () {
      const space = yield* Space.create({
        name: 'beet-box',
      })

      const { proofs } = yield* space.share({ audience: alice })
      const db = DB.from({ proofs })

      const result = Authorization.find(db, {
        can: { 'store/add': [] },
        audience: alice.did(),
      })

      assert.deepEqual(result, [
        Authorization.from({
          authority: alice.did(),
          can: { 'store/add': [] },
          subject: space.did(),
          proofs,
        }),
      ])
    }),

  'test find several spaces': (assert) =>
    Task.spawn(function* () {
      const beetBox = yield* Space.create({
        name: 'beet-box',
      })

      const beetBoxAuth = yield* beetBox.share({ audience: bob })

      const plumBox = yield* Space.create({
        name: 'plum-box',
      })

      const plumBoxAuth = yield* plumBox.share({ audience: bob })

      // create db from the proofs from both shares.
      const db = DB.from({
        proofs: [...beetBoxAuth.proofs, ...plumBoxAuth.proofs],
      })

      const result = Authorization.find(db, {
        can: { 'store/add': [], 'store/remove': [] },
        audience: bob.did(),
      })

      assert.deepEqual(result, [
        Authorization.from({
          authority: bob.did(),
          can: { 'store/add': [], 'store/remove': [] },
          subject: beetBox.did(),
          proofs: beetBoxAuth.proofs,
        }),
        Authorization.from({
          authority: bob.did(),
          can: { 'store/add': [], 'store/remove': [] },
          subject: plumBox.did(),
          proofs: plumBoxAuth.proofs,
        }),
      ])
    }),

  'test finds authorization across multiple ucans': (assert) =>
    Task.spawn(function* () {
      const spaceInfo = yield* Task.wait(
        Capability.Space.info.delegate({
          issuer: alice,
          audience: bob,
          with: alice.did(),
        })
      )

      const uploadList = yield* Task.wait(
        Capability.Upload.list.delegate({
          issuer: alice,
          audience: bob,
          with: alice.did(),
        })
      )

      const db = DB.from({ proofs: [spaceInfo, uploadList] })

      const result = Authorization.find(db, {
        can: { 'space/info': [], 'upload/list': [] },
        audience: bob.did(),
      })

      assert.deepEqual(result, [
        Authorization.from({
          authority: bob.did(),
          can: { 'space/info': [], 'upload/list': [] },
          subject: alice.did(),
          proofs: [spaceInfo, uploadList],
        }),
      ])
    }),

  'test find accounts': (assert) =>
    Task.spawn(function* () {
      const localSpace = yield* Space.create({ name: 'local-box' })

      const localAuth = yield* localSpace.share({ audience: alice })

      const {
        login,
        attestation,
        account,
        space: remoteSpace,
      } = yield* setupAccount()

      const db = DB.from({
        proofs: [login, attestation, ...localAuth.proofs],
      })

      const result = Authorization.find(db, {
        subject: { glob: 'did:mailto:*' },
        can: { '*': [] },
        audience: alice.did(),
      })

      assert.deepEqual(result, [
        Authorization.from({
          subject: account.did(),
          authority: alice.did(),
          can: { '*': [] },
          proofs: [login, attestation],
        }),
      ])

      const [first, second, ...rest] = Authorization.find(db, {
        subject: { glob: 'did:key:*' },
        can: { 'store/add': [] },
        audience: alice.did(),
      })

      assert.deepEqual(first.toJSON(), {
        authority: alice.did(),
        can: { 'store/add': [] },
        subject: localSpace.did(),
        proofs: localAuth.proofs,
      })

      assert.deepEqual(second.toJSON(), {
        authority: alice.did(),
        can: { 'store/add': [] },
        subject: remoteSpace.did(),
        proofs: [login, attestation],
      })

      assert.deepEqual(rest, [])
    }),

  'test find accounts and attestations': (assert) =>
    Task.spawn(function* () {
      const { login, attestation } = yield* setupAccount()

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
          DB.match([loginCan, 'capability/with', 'ucan:*']),

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
    }),

  'does not match expired ucans': (assert) =>
    Task.spawn(function* () {
      const space = yield* Space.create({ name: 'space' })
      const time = (Date.now() / 1000) | 0
      const expired = yield* space.share({
        audience: alice,
        expiration: time - 60 * 60 * 24,
      })

      const valid = yield* space.share({
        audience: alice,
        expiration: time + 60 * 60 * 24,
      })

      const db = DB.from({
        proofs: [...valid.proofs, ...expired.proofs],
      })

      const withoutExpired = Authorization.find(db, {
        can: { 'store/add': [] },
        audience: alice.did(),
        time,
      })

      assert.deepEqual(withoutExpired, [
        Authorization.from({
          authority: alice.did(),
          can: { 'store/add': [] },
          subject: space.did(),
          proofs: valid.proofs,
        }),
      ])

      const withExpired = Authorization.find(db, {
        can: { 'store/add': [] },
        audience: alice.did(),
        time: time - 60 * 60 * 24 * 2,
      })

      assert.deepEqual(withExpired, [
        Authorization.from({
          authority: alice.did(),
          can: { 'store/add': [] },
          subject: space.did(),
          proofs: valid.proofs,
        }),
        Authorization.from({
          authority: alice.did(),
          can: { 'store/add': [] },
          subject: space.did(),
          proofs: expired.proofs,
        }),
      ])
    }),

  'does match non-expiring ucans': (assert) =>
    Task.spawn(function* () {
      const space = yield* Space.create({ name: 'space' })
      const { proofs } = yield* space.share({
        audience: alice,
        expiration: Infinity,
      })

      const db = DB.from({
        proofs,
      })

      const result = Authorization.find(db, {
        can: { 'store/add': [] },
        audience: alice.did(),
      })

      assert.deepEqual(result, [
        Authorization.from({
          authority: alice.did(),
          can: { 'store/add': [] },
          subject: space.did(),
          proofs,
        }),
      ])
    }),

  'account view': (assert) =>
    Task.spawn(function* () {
      const aliceAccount = yield* setupAccount({
        email: 'alice@web.mail',
        agent: alice,
      })
      const bobAccount = yield* setupAccount({
        email: 'bob@web3.storage',
        agent: bob,
      })

      const db = DB.from({
        proofs: [...aliceAccount.proofs, ...bobAccount.proofs],
      })

      const time = Date.now() / 1000
      const ucan = DB.link()
      const audience = DB.string()
      const account = DB.string()

      const accounts = DB.query(db.index, {
        select: {
          ucan,
          account,
        },
        where: [
          Account.match(ucan, {
            time,
            audience,
            account,
          }),
        ],
      })

      assert.deepEqual(
        accounts,
        [
          {
            ucan: aliceAccount.login.cid,
            account: 'did:mailto:web.mail:alice',
          },
          {
            ucan: bobAccount.login.cid,
            account: 'did:mailto:web3.storage:bob',
          },
        ],
        'found both accounts'
      )

      DB.query(db.index, {
        select: {
          ucan,
          account,
        },
        where: [
          Account.match(ucan, {
            time,
            audience,
            account,
          }),
        ],
      })
    }),

  'find account spaces': (assert) =>
    Task.spawn(function* () {
      const aliceLogin = yield* setupAccount({
        name: 'Alice',
        email: 'alice@web.mail',
        agent: alice,
      })
      const bobLogin = yield* setupAccount({
        name: 'Bob',
        email: 'bob@web3.storage',
        agent: bob,
      })
      const aliLogin = yield* setupAccount({
        name: 'Ali',
        email: 'alice@web.mail',
        agent: alice,
      })

      const space = yield* Space.create({ name: 'space' })
      const { proofs } = yield* space.share({
        audience: alice,
        expiration: Infinity,
      })

      const db = DB.from({
        proofs: [
          ...aliceLogin.proofs,
          ...bobLogin.proofs,
          ...aliLogin.proofs,
          ...proofs,
        ],
      })

      const time = Date.now() / 1000
      const ucan = DB.link()
      const audience = DB.string()
      const account = DB.string()

      //     const space = DB.string()
      //     const proof = DB.link()
      //     const proofCap = DB.link()

      // const result = DB.query(
      //   db.index,
      //   Spaces.indirect({
      //     audience: alice.did(),
      //     can: { 'store/*': [] },
      //   })
      // )

      // assert.deepEqual(result, [
      //   {
      //     subject: aliceLogin.space.did(),
      //     audience: alice.did(),
      //     account: aliceLogin.account.did(),
      //     'store/*': aliceLogin.login.cid,
      //   },
      //   {
      //     subject: aliLogin.space.did(),
      //     audience: alice.did(),
      //     account: aliLogin.account.did(),
      //     'store/*': aliLogin.login.cid,
      //   },
      // ])

      // assert.deepEqual(
      //   DB.query(
      //     db.index,
      //     Spaces.indirect({ audience: bob.did(), can: { '*': [] } })
      //   ),
      //   [
      //     {
      //       subject: bobLogin.space.did(),
      //       audience: bob.did(),
      //       account: bobLogin.account.did(),
      //       '*': bobLogin.login.cid,
      //     },
      //   ],
      //   'finds account spaces delegated to bob'
      // )

      // assert.deepEqual(
      //   DB.query(
      //     db.index,
      //     Spaces.indirect({ audience: bob.did(), can: { '*': [] } })
      //   ),
      //   [
      //     {
      //       subject: bobLogin.space.did(),
      //       audience: bob.did(),
      //       account: bobLogin.account.did(),
      //       '*': bobLogin.login.cid,
      //     },
      //   ]
      // )

      // assert.deepEqual(
      //   DB.query(
      //     db.index,
      //     Spaces.direct({
      //       subject: { glob: 'did:key:*' },
      //       audience: alice.did(),
      //       can: { 'store/*': [] },
      //     })
      //   ),
      //   [
      //     {
      //       audience: alice.did(),
      //       subject: space.did(),
      //       'store/*': proofs[0].cid,
      //     },
      //   ],
      //   'finds spaces delegated to agent directly'
      // )

      // assert.deepEqual(
      //   DB.query(
      //     db.index,
      //     Spaces.indirect({
      //       account: aliceLogin.account.did(),
      //     })
      //   ),
      //   [
      //     {
      //       subject: aliceLogin.space.did(),
      //       audience: alice.did(),
      //       account: aliceLogin.account.did(),
      //       '*': aliceLogin.login.cid,
      //     },
      //     {
      //       subject: aliLogin.space.did(),
      //       audience: alice.did(),
      //       account: aliLogin.account.did(),
      //       '*': aliLogin.login.cid,
      //     },
      //   ]
      // )
    }),

  'account authority from login': (assert) =>
    Task.spawn(function* () {
      const account = Absentee.from({ id: fromEmail('alice@web.mail') })
      const proof = yield* Task.wait(
        delegate({
          issuer: account,
          audience: alice,
          capabilities: [
            {
              with: 'ucan:*',
              can: '*',
            },
          ],
          proofs: [],
        })
      )

      const attestation = yield* Task.wait(
        Capability.UCAN.attest.delegate({
          issuer: w3up,
          audience: alice,
          with: w3up.did(),
          nb: { proof: proof.cid },
          expiration: Infinity,
        })
      )

      const db = DB.from({
        proofs: [proof, attestation],
      })

      const result = Authorization.find(db, {
        can: { 'store/add': [] },
        audience: alice.did(),
        subject: account.did(),
      })

      assert.deepEqual(
        result,
        [
          Authorization.from({
            authority: alice.did(),
            subject: account.did(),
            can: { 'store/add': [] },
            proofs: [proof, attestation],
          }),
        ],
        'requires attestation'
      )
    }),

  'account authority from authorization': (assert) =>
    Task.spawn(function* () {
      const account = Absentee.from({ id: fromEmail('alice@web.mail') })
      const proof = yield* Task.wait(
        delegate({
          issuer: account,
          audience: alice,
          capabilities: [
            {
              with: 'ucan:*',
              can: 'store/*',
            },
          ],
          proofs: [],
        })
      )

      const db = DB.from({
        proofs: [proof],
      })

      assert.deepEqual(
        Authorization.find(db, {
          can: { 'store/add': [] },
          audience: alice.did(),
          subject: account.did(),
        }),
        [],
        'can not find without attestation'
      )

      const attestation = yield* Task.wait(
        Capability.UCAN.attest.delegate({
          issuer: w3up,
          audience: alice,
          with: w3up.did(),
          nb: { proof: proof.cid },
          expiration: Infinity,
        })
      )

      // save attestation
      yield* DB.transact(db, [{ assert: { proof: attestation } }])

      assert.deepEqual(
        Authorization.find(db, {
          can: { 'store/add': [] },
          audience: alice.did(),
          subject: account.did(),
        }),
        [
          Authorization.from({
            authority: alice.did(),
            subject: account.did(),
            can: { 'store/add': [] },
            proofs: [proof, attestation],
          }),
        ],
        'found when attestation was added'
      )
    }),

  'find whatever capabilities match': (assert) =>
    Task.spawn(function* () {
      const space = yield* Space.create({ name: 'beet-box' })

      const { proofs } = yield* space.share({ audience: alice })
      const db = DB.from({ proofs })

      const result = Authorization.find(db, {
        audience: alice.did(),
      })

      assert.deepEqual(
        result,
        proofs[0].capabilities.map(({ can }) =>
          Authorization.from({
            authority: alice.did(),
            can: { [can]: [] },
            subject: space.did(),
            proofs,
          })
        )
      )
    }),

  'find capabilities grouped by spaces': (assert) =>
    Task.spawn(function* () {
      const beetBox = yield* Space.create({ name: 'beet-box' })
      const yumBox = yield* Space.create({ name: 'yum-box' })
      const aliceLogin = yield* setupAccount({
        name: 'Alice',
        email: 'alice@web.mail',
        agent: alice,
      })

      const db = DB.from({
        proofs: [
          yield* Task.wait(
            Capability.Space.space.delegate({
              issuer: bob,
              audience: alice,
              with: bob.did(),
            })
          ),

          ...(yield* beetBox.share({ audience: alice })).proofs,
          ...(yield* beetBox.share({ audience: alice, can: { 'debug/*': [] } }))
            .proofs,
          ...(yield* yumBox.share({ audience: alice, can: { 'store/*': [] } }))
            .proofs,
          ...(yield* yumBox.share({ audience: alice, can: { 'upload/*': [] } }))
            .proofs,
          ...(yield* yumBox.share({ audience: alice, can: { 'space/*': [] } }))
            .proofs,
          ...(yield* yumBox.share({ audience: alice, can: { 'access/*': [] } }))
            .proofs,
          aliceLogin.login,
          aliceLogin.attestation,
        ],
      })

      const space = DB.string()
      const proof = DB.link()
      const name = DB.string()

      const explicit = DB.query(db.index, {
        select: {
          space,
          name,
        },
        where: [
          Spaces.explicit(proof, {
            audience: alice.did(),
            name,
            space,
          }),
        ],
      })

      assert.deepEqual(
        Object.fromEntries(explicit.map(({ space, name }) => [space, name])),
        {
          [beetBox.did()]: 'beet-box',
          [yumBox.did()]: 'yum-box',
          [bob.did()]: undefined,
        }
      )

      const implicit = DB.query(db.index, {
        select: {
          space,
          name,
        },
        where: [
          Spaces.implicit(proof, {
            audience: alice.did(),
            name,
            space,
          }),
        ],
      })

      assert.deepEqual(
        Object.fromEntries(implicit.map(({ space, name }) => [space, name])),
        {
          [aliceLogin.space.did()]: 'Alice',
        }
      )

      const all = DB.query(db.index, {
        select: {
          space,
          name,
        },
        where: [
          Spaces.match(proof, {
            audience: alice.did(),
            name,
            space,
          }),
        ],
      })

      assert.deepEqual(
        Object.fromEntries(all.map(({ space, name }) => [space, name])),
        {
          [beetBox.did()]: 'beet-box',
          [yumBox.did()]: 'yum-box',
          [aliceLogin.space.did()]: 'Alice',
          [bob.did()]: undefined,
        }
      )
    }),

  'find re-delegated account capabilities': (assert) =>
    Task.spawn(function* () {
      const { account, space: subject, login, proofs } = yield* setupAccount()

      const delegation = yield* Task.wait(
        delegate({
          issuer: alice,
          audience: bob,
          capabilities: [
            {
              with: account.did(),
              can: 'provider/*',
            },
            {
              with: subject.did(),
              can: 'store/*',
            },
          ],
          proofs,
        })
      )

      const db = DB.from({ proofs: [delegation, ...proofs] })

      const space = DB.string()
      const proof = DB.link()

      const spaces = DB.query(db.index, {
        select: {
          space,
          proof,
        },
        where: [
          Spaces.match(proof, {
            audience: bob.did(),
            space,
          }),
        ],
      })

      assert.deepEqual(spaces, [
        { space: subject.did(), proof: delegation.cid },
      ])

      const accountVar = DB.string()
      const bobAccounts = DB.query(db.index, {
        select: {
          account: accountVar,
          proof,
        },
        where: [
          Account.match(proof, {
            account: accountVar,
            audience: bob.did(),
          }),
        ],
      })

      assert.deepEqual(bobAccounts, [
        { account: account.did(), proof: delegation.cid },
      ])

      const aliceAccounts = DB.query(db.index, {
        select: {
          account: accountVar,
          proof,
        },
        where: [
          Account.match(proof, {
            account: accountVar,
            audience: alice.did(),
          }),
        ],
      })
      assert.deepEqual(aliceAccounts, [
        { account: account.did(), proof: login.cid },
      ])
    }),
}

/**
 *
 * @param {API.Delegation} delegation
 * @returns {Task.Task<API.Delegation, never>}
 */

function* attest(delegation) {
  return yield* Task.wait(
    Capability.UCAN.attest.delegate({
      issuer: w3up,
      audience: delegation.audience,
      with: w3up.did(),
      nb: { proof: delegation.cid },
      expiration: Infinity,
    })
  )
}

function* setupAccount({
  email = /** @type {`${string}@${string}`} */ ('alice@web.mail'),
  name = 'stuff',
  agent = alice,
} = {}) {
  const space = yield* Space.create({ name })

  const account = Absentee.from({ id: fromEmail(email) })

  const recovery = yield* space.createRecovery({ audience: account })
  const login = yield* Task.wait(
    delegate({
      issuer: account,
      audience: agent,
      capabilities: [
        {
          with: 'ucan:*',
          can: '*',
        },
      ],
      proofs: recovery.proofs,
    })
  )

  const attestation = yield* attest(login)

  return {
    space,
    account,
    recovery,
    login,
    attestation,
    proofs: [login, attestation],
  }
}

Test.basic({ DB: testDB })
