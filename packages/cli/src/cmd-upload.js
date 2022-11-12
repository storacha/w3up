/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import { uploadFile, uploadDirectory, delegateCapabilities } from '@web3-storage/upload-client'
import { Agent } from '@web3-storage/access'
import { getService } from '@web3-storage/access/cli/utils'
import { StoreConf } from '@web3-storage/access/stores/store-conf'
import ora from 'ora'
import { filesFromPath } from 'files-from-path'

/**
 * Add 1 or more files/directories to web3.storage
 *
 * @param {string} firstPath the first file path to store
 * @param {object} opts
 * @param {string} [opts.env]
 * @param {string} [opts.profile]
 * @param {string} [opts.wrap] wrap with directory
 * @param {string} [opts.name] upload name
 * @param {boolean} [opts.hidden] include paths that start with .
 * @param {boolean|number} [opts.retry] set maxRetries for client.put
 * @param {string[]} opts._ additonal paths to add
 */
export async function cmdUpload (firstPath, opts) {
  const paths = checkPathsExist([firstPath, ...opts._])
  // @ts-ignore
  const store = new StoreConf({ profile: opts.profile })

  const exists = await store.exists()
  if (!exists) {
    console.error('run setup command first.')
    process.exit(1)
  }

  const { url } = await getService(opts.env ?? 'production')
  const agent = await Agent.create({ store, url })
  if (!agent.data.accounts.length) {
    console.error('run account create command first.')
    process.exit(1)
  }

  const delegation = await delegateCapabilities(agent.data.accounts[0], agent.issuer)
  await agent.addDelegation(delegation)

  const conf = {
    issuer: agent.issuer,
    proofs: agent.data.delegations.received
  }

  for (const d of agent.data.delegations.received) {
    console.log(d.capabilities)
  }

  // pass either --no-retry or --retry <number>
  const retries = Number.isInteger(Number(opts.retry))
    ? Number(opts.retry)
    : opts.retry === false ? 0 : undefined
  if (retries !== undefined) {
    console.log(`⁂ maxRetries: ${retries}`)
  }

  const hidden = !!opts.hidden
  const files = []
  let totalSize = 0
  let totalSent = 0
  const spinner = ora('Packing files').start()
  for (const p of paths) {
    for await (const file of filesFromPath(p, { hidden })) {
      totalSize += file.size
      files.push(file)
      spinner.text = `Packing ${files.length} file${files.length === 1 ? '' : 's'} (${filesize(totalSize)})`
    }
  }
  spinner.stopAndPersist({ symbol: '#', text: `Packed ${files.length} file${files.length === 1 ? '' : 's'} (${filesize(totalSize)})` })

  let rootCid
  /** @type {import('@web3-storage/upload-client').StoredShardCallback} */
  const onStoredShard = ({ cid, size }) => {
    totalSent += size
    spinner.stopAndPersist({ symbol: '#', text: `Stored shard ${cid} (${filesize(size)})` })
    spinner.start('Storing')
  }

  spinner.start('Storing')
  if (files.length > 1 || opts.wrap) {
    rootCid = await uploadDirectory(conf, files, { retries, onStoredShard })
  } else {
    // @ts-ignore
    rootCid = await uploadFile(conf, files[0], { retries, onStoredShard })
  }
  spinner.stopAndPersist({ symbol: '⁂', text: `Stored ${files.length} file${files.length === 1 ? '' : 's'} (${filesize(totalSent)})` })
  console.log(`⁂ https://w3s.link/ipfs/${rootCid}`)
}

/** @param {number} bytes */
function filesize (bytes) {
  const size = bytes / 1024 / 1024
  return `${size.toFixed(1)}MB`
}

/** @param {string|string[]} paths */
function checkPathsExist (paths) {
  paths = Array.isArray(paths) ? paths : [paths]
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.error(`The path ${path.resolve(p)} does not exist`)
      process.exit(1)
    }
  }
  return paths
}
