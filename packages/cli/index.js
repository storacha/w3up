import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import ora from 'ora'
import { CID } from 'multiformats/cid'
import { base64 } from 'multiformats/bases/base64'
import { identity } from 'multiformats/hashes/identity'
import * as Digest from 'multiformats/hashes/digest'
import * as DID from '@ipld/dag-ucan/did'
import * as dagJSON from '@ipld/dag-json'
import { CarWriter } from '@ipld/car'
import { filesFromPaths } from 'files-from-path'
import * as PieceHasher from 'fr32-sha2-256-trunc254-padded-binary-tree-multihash'
import * as Account from './account.js'

import { spaceAccess } from '@storacha/client/capability/access'
import { AgentData } from '@storacha/access'
import * as Space from './space.js'
import {
  getClient,
  getStore,
  checkPathsExist,
  filesize,
  filesizeMB,
  readProof,
  readProofFromBytes,
  uploadListResponseToString,
  startOfLastMonth,
} from './lib.js'
import * as ucanto from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import chalk from 'chalk'
export * as Coupon from './coupon.js'
export * as Bridge from './bridge.js'
export { Account, Space }
import ago from 's-ago'

/**
 *
 */
export async function accessClaim() {
  const client = await getClient()
  await client.capability.access.claim()
}

/**
 * @param {string} email
 */
export const getPlan = async (email = '') => {
  const client = await getClient()
  const account =
    email === ''
      ? await Space.selectAccount(client)
      : await Space.useAccount(client, { email })

  if (account) {
    const { ok: plan, error } = await account.plan.get()
    if (plan) {
      console.log(`⁂ ${plan.product}`)
    } else if (error?.name === 'PlanNotFound') {
      console.log('⁂ no plan has been selected yet')
    } else {
      console.error(`Failed to get plan - ${error.message}`)
      process.exit(1)
    }
  } else {
    process.exit(1)
  }
}

/**
 * @param {`${string}@${string}`} email
 * @param {object} [opts]
 * @param {import('@ucanto/interface').Ability[]|import('@ucanto/interface').Ability} [opts.can]
 */
export async function authorize(email, opts = {}) {
  const client = await getClient()
  const capabilities =
    opts.can != null ? [opts.can].flat().map((can) => ({ can })) : undefined
  /** @type {import('ora').Ora|undefined} */
  let spinner
  setTimeout(() => {
    spinner = ora(
      `🔗 please click the link we sent to ${email} to authorize this agent`
    ).start()
  }, 1000)
  try {
    await client.authorize(email, { capabilities })
  } catch (err) {
    if (spinner) spinner.stop()
    console.error(err)
    process.exit(1)
  }
  if (spinner) spinner.stop()
  console.log(`⁂ agent authorized to use capabilities delegated to ${email}`)
}

/**
 * @param {string} firstPath
 * @param {{
 *   _: string[],
 *   car?: boolean
 *   hidden?: boolean
 *   json?: boolean
 *   verbose?: boolean
 *   wrap?: boolean
 *   'shard-size'?: number
 *   'concurrent-requests'?: number
 * }} [opts]
 */
export async function upload(firstPath, opts) {
  /** @type {import('@storacha/client/types').FileLike[]} */
  let files
  /** @type {number} */
  let totalSize // -1 when unknown size (input from stdin)
  /** @type {import('ora').Ora} */
  let spinner
  const client = await getClient()
  if (firstPath) {
    const paths = checkPathsExist([firstPath, ...(opts?._ ?? [])])
    const hidden = !!opts?.hidden
    spinner = ora({ text: 'Reading files', isSilent: opts?.json }).start()
    const localFiles = await filesFromPaths(paths, { hidden })
    totalSize = localFiles.reduce((total, f) => total + f.size, 0)
    files = localFiles
    spinner.stopAndPersist({
      text: `${files.length} file${files.length === 1 ? '' : 's'} ${chalk.dim(
        filesize(totalSize)
      )}`,
    })

    if (opts?.car && files.length > 1) {
      console.error('Error: multiple CAR files not supported')
      process.exit(1)
    }
  } else {
    spinner = ora({ text: 'Reading from stdin', isSilent: opts?.json }).start()
    files = [
      {
        name: 'stdin',
        stream: () =>
          /** @type {ReadableStream} */
          (Readable.toWeb(process.stdin)),
      },
    ]
    totalSize = -1
    opts = opts ?? { _: [] }
    opts.wrap = false
  }

  spinner.start('Storing')
  /** @type {(o?: import('@storacha/client/src/types').UploadOptions) => Promise<import('@storacha/client/src/types').AnyLink>} */
  const uploadFn = opts?.car
    ? client.uploadCAR.bind(client, files[0])
    : files.length === 1 && opts?.wrap === false
      ? client.uploadFile.bind(client, files[0])
      : client.uploadDirectory.bind(client, files)

  let totalSent = 0
  const getStoringMessage = () =>
    totalSize == -1
      ? // for unknown size, display the amount sent so far
        `Storing ${filesizeMB(totalSent)}`
      : // for known size, display percentage of total size that has been sent
        `Storing ${Math.min(Math.round((totalSent / totalSize) * 100), 100)}%`

  const root = await uploadFn({
    pieceHasher: {
      code: PieceHasher.code,
      name: 'fr32-sha2-256-trunc254-padded-binary-tree-multihash',
      async digest(input) {
        const hasher = PieceHasher.create()
        hasher.write(input)

        const bytes = new Uint8Array(hasher.multihashByteLength())
        hasher.digestInto(bytes, 0, true)
        hasher.free()

        return Digest.decode(bytes)
      },
    },
    onShardStored: ({ cid, size, piece }) => {
      totalSent += size
      if (opts?.verbose) {
        spinner.stopAndPersist({
          text: `${cid} ${chalk.dim(filesizeMB(size))}\n${chalk.dim(
            '   └── '
          )}Piece CID: ${piece}`,
        })
        spinner.start(getStoringMessage())
      } else {
        spinner.text = getStoringMessage()
      }
      opts?.json &&
        opts?.verbose &&
        console.log(dagJSON.stringify({ shard: cid, size, piece }))
    },
    shardSize: opts?.['shard-size'] && parseInt(String(opts?.['shard-size'])),
    concurrentRequests:
      opts?.['concurrent-requests'] &&
      parseInt(String(opts?.['concurrent-requests'])),
    receiptsEndpoint: client._receiptsEndpoint.toString(),
  })
  spinner.stopAndPersist({
    symbol: '⁂',
    text: `Stored ${files.length} file${files.length === 1 ? '' : 's'}`,
  })
  console.log(
    opts?.json ? dagJSON.stringify({ root }) : `⁂ https://w3s.link/ipfs/${root}`
  )
}

/**
 * Print out all the uploads in the current space.
 *
 * @param {object} opts
 * @param {boolean} [opts.json]
 * @param {boolean} [opts.shards]
 */
export async function list(opts = {}) {
  const client = await getClient()
  let count = 0
  /** @type {import('@storacha/client/types').UploadListSuccess|undefined} */
  let res
  do {
    res = await client.capability.upload.list({ cursor: res?.cursor })
    if (!res) throw new Error('missing upload list response')
    count += res.results.length
    if (res.results.length) {
      console.log(uploadListResponseToString(res, opts))
    }
  } while (res.cursor && res.results.length)

  if (count === 0 && !opts.json) {
    console.log('⁂ No uploads in space')
    console.log('⁂ Try out `storacha up <path to files>` to upload some')
  }
}
/**
 * @param {string} rootCid
 * @param {object} opts
 * @param {boolean} [opts.shards]
 */
export async function remove(rootCid, opts) {
  let root
  try {
    root = CID.parse(rootCid.trim())
  } catch (/** @type {any} */ err) {
    console.error(`Error: ${rootCid} is not a CID`)
    process.exit(1)
  }
  const client = await getClient()

  try {
    await client.remove(root, opts)
  } catch (/** @type {any} */ err) {
    console.error(`Remove failed: ${err.message ?? err}`)
    console.error(err)
    process.exit(1)
  }
}

/**
 * @param {string} name
 */
export async function createSpace(name) {
  const client = await getClient()
  const space = await client.createSpace(name, {
    skipGatewayAuthorization: true,
  })
  await client.setCurrentSpace(space.did())
  console.log(space.did())
}

/**
 * @param {string} proofPathOrCid
 */
export async function addSpace(proofPathOrCid) {
  const client = await getClient()

  let cid
  try {
    cid = CID.parse(proofPathOrCid, base64)
  } catch (/** @type {any} */ err) {
    if (err?.message?.includes('Unexpected end of data')) {
      console.error(
        `Error: failed to read proof. The string has been truncated.`
      )
      process.exit(1)
    }
    /* otherwise, try as path */
  }

  let delegation
  if (cid) {
    if (cid.multihash.code !== identity.code) {
      console.error(
        `Error: failed to read proof. Must be identity CID. Fetching of remote proof CARs not supported by this command yet`
      )
      process.exit(1)
    }
    delegation = await readProofFromBytes(cid.multihash.digest)
  } else {
    delegation = await readProof(proofPathOrCid)
  }

  const space = await client.addSpace(delegation)
  console.log(space.did())
}

/**
 *
 */
export async function listSpaces() {
  const client = await getClient()
  const current = client.currentSpace()
  for (const space of client.spaces()) {
    const prefix = current && current.did() === space.did() ? '* ' : '  '
    console.log(`${prefix}${space.did()} ${space.name ?? ''}`)
  }
}

/**
 * @param {string} did
 */
export async function useSpace(did) {
  const client = await getClient()
  const spaces = client.spaces()
  const space =
    spaces.find((s) => s.did() === did) ?? spaces.find((s) => s.name === did)
  if (!space) {
    console.error(`Error: space not found: ${did}`)
    process.exit(1)
  }
  await client.setCurrentSpace(space.did())
  console.log(space.did())
}

/**
 * @param {object} opts
 * @param {import('@storacha/client/types').DID} [opts.space]
 * @param {string} [opts.json]
 */
export async function spaceInfo(opts) {
  const client = await getClient()
  const spaceDID = opts.space ?? client.currentSpace()?.did()
  if (!spaceDID) {
    throw new Error(
      'no current space and no space given: please use --space to specify a space or select one using "space use"'
    )
  }

  /** @type {import('@storacha/access/types').SpaceInfoResult} */
  let info
  try {
    info = await client.capability.space.info(spaceDID)
  } catch (/** @type {any} */ err) {
    // if the space was not known to the service then that's ok, there's just
    // no info to print about it. Don't make it look like something is wrong,
    // just print the space DID since that's all we know.
    if (err.name === 'SpaceUnknown') {
      // @ts-expect-error spaceDID should be a did:key
      info = { did: spaceDID }
    } else {
      return console.log(`Error getting info about ${spaceDID}: ${err.message}`)
    }
  }

  const space = client.spaces().find((s) => s.did() === spaceDID)
  const name = space ? space.name : undefined

  if (opts.json) {
    console.log(JSON.stringify({ ...info, name }, null, 4))
  } else {
    const providers = info.providers?.join(', ') ?? ''
    console.log(`
      DID: ${info.did}
Providers: ${providers || chalk.dim('none')}
     Name: ${name ?? chalk.dim('none')}`)
  }
}

/**
 * @param {string} audienceDID
 * @param {object} opts
 * @param {string[]|string} opts.can
 * @param {string} [opts.name]
 * @param {string} [opts.type]
 * @param {number} [opts.expiration]
 * @param {string} [opts.output]
 * @param {string} [opts.with]
 * @param {boolean} [opts.base64]
 */
export async function createDelegation(audienceDID, opts) {
  const client = await getClient()

  if (client.currentSpace() == null) {
    throw new Error(
      'no current space, use `storacha space register` to create one.'
    )
  }
  const audience = DID.parse(audienceDID)

  const abilities = opts.can ? [opts.can].flat() : Object.keys(spaceAccess)
  if (!abilities.length) {
    console.error('Error: missing capabilities for delegation')
    process.exit(1)
  }
  const audienceMeta = {}
  if (opts.name) audienceMeta.name = opts.name
  if (opts.type) audienceMeta.type = opts.type
  const expiration = opts.expiration || Infinity

  // @ts-expect-error createDelegation should validate abilities
  const delegation = await client.createDelegation(audience, abilities, {
    expiration,
    audienceMeta,
  })

  const { writer, out } = CarWriter.create()
  const dest = opts.output ? fs.createWriteStream(opts.output) : process.stdout

  void pipeline(
    out,
    async function* maybeBaseEncode(src) {
      const chunks = []
      for await (const chunk of src) {
        if (!opts.base64) {
          yield chunk
        } else {
          chunks.push(chunk)
        }
      }
      if (!opts.base64) return
      const blob = new Blob(chunks)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const idCid = CID.createV1(ucanto.CAR.code, identity.digest(bytes))
      yield idCid.toString(base64)
    },
    dest
  )

  for (const block of delegation.export()) {
    // @ts-expect-error
    await writer.put(block)
  }
  await writer.close()
}

/**
 * @param {object} opts
 * @param {boolean} [opts.json]
 */
export async function listDelegations(opts) {
  const client = await getClient()
  const delegations = client.delegations()
  if (opts.json) {
    for (const delegation of delegations) {
      console.log(
        JSON.stringify({
          cid: delegation.cid.toString(),
          audience: delegation.audience.did(),
          capabilities: delegation.capabilities.map((c) => ({
            with: c.with,
            can: c.can,
          })),
        })
      )
    }
  } else {
    for (const delegation of delegations) {
      console.log(delegation.cid.toString())
      console.log(`  audience: ${delegation.audience.did()}`)
      for (const capability of delegation.capabilities) {
        console.log(`  with: ${capability.with}`)
        console.log(`  can: ${capability.can}`)
      }
    }
  }
}

/**
 * @param {string} delegationCid
 * @param {object} opts
 * @param {string} [opts.proof]
 */
export async function revokeDelegation(delegationCid, opts) {
  const client = await getClient()
  let proof
  try {
    if (opts.proof) {
      proof = await readProof(opts.proof)
    }
  } catch (/** @type {any} */ err) {
    console.log(`Error: reading proof: ${err.message}`)
    process.exit(1)
  }
  let cid
  try {
    // TODO: we should validate that this is a UCANLink
    cid = ucanto.parseLink(delegationCid.trim())
  } catch (/** @type {any} */ err) {
    console.error(`Error: invalid CID: ${delegationCid}: ${err.message}`)
    process.exit(1)
  }
  const result = await client.revokeDelegation(
    /** @type {import('@ucanto/interface').UCANLink} */ (cid),
    { proofs: proof ? [proof] : [] }
  )
  if (result.ok) {
    console.log(`⁂ delegation ${delegationCid} revoked`)
  } else {
    console.error(`Error: revoking ${delegationCid}: ${result.error?.message}`)
    process.exit(1)
  }
}

/**
 * @param {string} proofPath
 * @param {{ json?: boolean, 'dry-run'?: boolean }} [opts]
 */
export async function addProof(proofPath, opts) {
  const client = await getClient()
  let proof
  try {
    proof = await readProof(proofPath)
    if (!opts?.['dry-run']) {
      await client.addProof(proof)
    }
  } catch (/** @type {any} */ err) {
    console.log(`Error: ${err.message}`)
    process.exit(1)
  }
  if (opts?.json) {
    console.log(JSON.stringify(proof.toJSON()))
  } else {
    console.log(proof.cid.toString())
    console.log(`  issuer: ${proof.issuer.did()}`)
    for (const capability of proof.capabilities) {
      console.log(`  with: ${capability.with}`)
      console.log(`  can: ${capability.can}`)
    }
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.json]
 */
export async function listProofs(opts) {
  const client = await getClient()
  const proofs = client.proofs()
  if (opts.json) {
    for (const proof of proofs) {
      console.log(JSON.stringify(proof))
    }
  } else {
    for (const proof of proofs) {
      console.log(chalk.dim(`# ${proof.cid.toString()}`))
      console.log(`iss: ${chalk.cyanBright(proof.issuer.did())}`)
      if (proof.expiration !== Infinity) {
        console.log(
          `exp: ${chalk.yellow(proof.expiration)} ${chalk.dim(
            ` # expires ${ago(new Date(proof.expiration * 1000))}`
          )}`
        )
      }
      console.log('att:')
      for (const capability of proof.capabilities) {
        console.log(`  - can: ${chalk.magentaBright(capability.can)}`)
        console.log(`    with: ${chalk.green(capability.with)}`)
        if (capability.nb) {
          console.log(`    nb: ${JSON.stringify(capability.nb)}`)
        }
      }
      if (proof.facts.length > 0) {
        console.log('fct:')
      }
      for (const fact of proof.facts) {
        console.log(`  - ${JSON.stringify(fact)}`)
      }
      console.log('')
    }
    console.log(
      chalk.dim(
        `# ${proofs.length} proof${
          proofs.length === 1 ? '' : 's'
        } for ${client.agent.did()}`
      )
    )
  }
}

/**
 *
 */
export async function whoami() {
  const client = await getClient()
  console.log(client.did())
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.human]
 * @param {boolean} [opts.json]
 */
export async function usageReport(opts) {
  const client = await getClient()
  const now = new Date()
  const period = {
    // we may not have done a snapshot for this month _yet_, so get report from last month -> now
    from: startOfLastMonth(now),
    to: now,
  }
  const failures = []
  let total = 0
  for await (const result of getSpaceUsageReports(client, period)) {
    if ('error' in result) {
      failures.push(result)
    } else {
      if (opts?.json) {
        const { account, provider, space, size } = result
        console.log(
          dagJSON.stringify({
            account,
            provider,
            space,
            size,
            reportedAt: now.toISOString(),
          })
        )
      } else {
        const { account, provider, space, size } = result
        console.log(` Account: ${account}`)
        console.log(`Provider: ${provider}`)
        console.log(`   Space: ${space}`)
        console.log(
          `    Size: ${opts?.human ? filesize(size.final) : size.final}\n`
        )
      }
      total += result.size.final
    }
  }
  if (!opts?.json) {
    console.log(`   Total: ${opts?.human ? filesize(total) : total}`)
    if (failures.length) {
      console.warn(``)
      console.warn(
        `   WARNING: there were ${failures.length} errors getting usage reports for some spaces.`
      )
      console.warn(
        `   This may happen if your agent does not have usage/report authorization for a space.`
      )
      console.warn(
        `   These spaces were not included in the usage report total:`
      )
      for (const fail of failures) {
        console.warn(`   * space: ${fail.space}`)
        // @ts-expect-error error is unknown
        console.warn(`     error: ${fail.error?.message}`)
        console.warn(`     account: ${fail.account}`)
      }
    }
  }
}

/**
 * @param {import('@storacha/client').Client} client
 * @param {{ from: Date, to: Date }} period
 */
async function* getSpaceUsageReports(client, period) {
  for (const account of Object.values(client.accounts())) {
    const subscriptions = await client.capability.subscription.list(
      account.did()
    )
    for (const { consumers } of subscriptions.results) {
      for (const space of consumers) {
        /** @type {import('@storacha/client/types').UsageReportSuccess} */
        let result
        try {
          result = await client.capability.usage.report(space, period)
        } catch (error) {
          yield { error, space, period, consumers, account: account.did() }
          continue
        }
        for (const [, report] of Object.entries(result)) {
          yield { account: account.did(), ...report }
        }
      }
    }
  }
}

/**
 * @param {{ json: boolean }} options
 */
export async function createKey({ json }) {
  const signer = await ed25519.generate()
  const key = ed25519.format(signer)
  if (json) {
    console.log(JSON.stringify({ did: signer.did(), key }, null, 2))
  } else {
    console.log(`# ${signer.did()}`)
    console.log(key)
  }
}

export const reset = async () => {
  const store = getStore()
  const exportData = await store.load()
  if (exportData) {
    let data = AgentData.fromExport(exportData)
    // do not reset the principal
    data = await AgentData.create({
      principal: data.principal,
      meta: data.meta,
    })
    await store.save(data.export())
  }
  console.log('⁂ Agent reset.')
}
