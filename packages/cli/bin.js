#!/usr/bin/env node

import sade from 'sade'
import open from 'open'
import updateNotifier from 'update-notifier'
import { getPkg } from './lib.js'
import {
  Account,
  Space,
  Coupon,
  Bridge,
  accessClaim,
  addSpace,
  listSpaces,
  useSpace,
  spaceInfo,
  createDelegation,
  listDelegations,
  revokeDelegation,
  addProof,
  listProofs,
  upload,
  remove,
  list,
  whoami,
  usageReport,
  getPlan,
  createKey,
  reset,
} from './index.js'
import {
  blobAdd,
  blobList,
  blobRemove,
  indexAdd,
  uploadAdd,
  uploadList,
  uploadRemove,
  filecoinInfo,
} from './can.js'

const pkg = getPkg()

updateNotifier({ pkg }).notify({ isGlobal: true })

const cli = sade('storacha')

cli
  .version(pkg.version)
  .example('login user@example.com')
  .example('up path/to/files')

cli
  .command('login <email>')
  .example('login user@example.com')
  .describe(
    'Authenticate this agent with your email address to gain access to all capabilities that have been delegated to it.'
  )
  .action(Account.login)

cli
  .command('plan get [email]')
  .example('plan get user@example.com')
  .describe('Displays plan given account is on')
  .action(getPlan)

cli
  .command('account ls')
  .alias('account list')
  .describe('List accounts this agent has been authorized to act on behalf of.')
  .action(Account.list)

cli
  .command('up [file]')
  .alias('upload', 'put')
  .describe('Store a file(s) to the service and register an upload.')
  .option('-H, --hidden', 'Include paths that start with ".".', false)
  .option('-c, --car', 'File is a CAR file.', false)
  .option(
    '--wrap',
    'Wrap single input file in a directory. Has no effect on directory or CAR uploads. Pass --no-wrap to disable.',
    true
  )
  .option('--json', 'Format as newline delimited JSON', false)
  .option('--verbose', 'Output more details.', false)
  .option(
    '--shard-size',
    'Shard uploads into CAR files of approximately this size in bytes.'
  )
  .option(
    '--concurrent-requests',
    'Send up to this many CAR shards concurrently.'
  )
  .action(upload)

cli
  .command('open <cid>')
  .describe('Open CID on https://w3s.link')
  .action((cid) => open(`https://w3s.link/ipfs/${cid}`))

cli
  .command('ls')
  .alias('list')
  .describe('List uploads in the current space')
  .option('--json', 'Format as newline delimited JSON')
  .option('--shards', 'Pretty print with shards in output')
  .action(list)

cli
  .command('rm <root-cid>')
  .example('rm bafy...')
  .describe(
    'Remove an upload from the uploads listing. Pass --shards to delete the actual data if you are sure no other uploads need them'
  )
  .option(
    '--shards',
    'Remove all shards referenced by the upload from the store. Use with caution and ensure other uploads do not reference the same shards.'
  )
  .action(remove)

cli
  .command('whoami')
  .describe('Print information about the current agent.')
  .action(whoami)

cli
  .command('space create [name]')
  .describe('Create a new storacha space')
  .option('-nr, --no-recovery', 'Skips recovery key setup')
  .option('-n, --no-caution', 'Prints out recovery key without confirmation')
  .option('-nc, --no-customer', 'Skip billing setup')
  .option('-c, --customer <email>', 'Billing account email')
  .option('-na, --no-account', 'Skip account setup')
  .option('-a, --account <email>', 'Managing account email')
  .option(
    '-ag, --authorize-gateway-services <json>',
    'Authorize Gateways to serve the content uploaded to this space, e.g: \'[{"id":"did:key:z6Mki...","serviceEndpoint":"https://gateway.example.com"}]\''
  )
  .option('-nga, --no-gateway-authorization', 'Skip Gateway Authorization')
  .action((name, options) => {
    let authorizeGatewayServices = []
    if (options['authorize-gateway-services']) {
      try {
        authorizeGatewayServices = JSON.parse(
          options['authorize-gateway-services']
        )
      } catch (err) {
        console.error('Invalid JSON format for --authorize-gateway-services')
        process.exit(1)
      }
    }

    const parsedOptions = {
      ...options,
      // if defined it means we want to skip gateway authorization, so the client will not validate the gateway services
      skipGatewayAuthorization:
        options['gateway-authorization'] === false ||
        options['gateway-authorization'] === undefined,
      // default to empty array if not set, so the client will validate the gateway services
      authorizeGatewayServices: authorizeGatewayServices || [],
    }

    return Space.create(name, parsedOptions)
  })

cli
  .command('space provision [name]')
  .describe('Associating space with a billing account')
  .option('-c, --customer', 'The email address of the billing account')
  .option('--coupon', 'Coupon URL to provision space with')
  .option('-p, -password', 'Coupon password')
  .option(
    '-p, --provider',
    'The storage provider to associate with this space.'
  )
  .action(Space.provision)

cli
  .command('space add <proof>')
  .describe(
    'Import a space from a proof: a CAR encoded UCAN delegating capabilities to this agent. proof is a filesystem path, or a base64 encoded cid string.'
  )
  .action(addSpace)

cli
  .command('space ls')
  .describe('List spaces known to the agent')
  .action(listSpaces)

cli
  .command('space info')
  .describe('Show information about a space. Defaults to the current space.')
  .option('-s, --space', 'The space to print information about.')
  .option('--json', 'Format as newline delimited JSON')
  .action(spaceInfo)

cli
  .command('space use <did>')
  .describe('Set the current space in use by the agent')
  .action(useSpace)

cli
  .command('coupon create <did>')
  .option('--password', 'Password for created coupon.')
  .option('-c, --can', 'One or more abilities to delegate.')
  .option(
    '-e, --expiration',
    'Unix timestamp when the delegation is no longer valid. Zero indicates no expiration.',
    0
  )
  .option(
    '-o, --output',
    'Path of file to write the exported delegation data to.'
  )
  .action(Coupon.issue)

cli
  .command('bridge generate-tokens <did>')
  .option('-c, --can', 'One or more abilities to delegate.')
  .option(
    '-e, --expiration',
    'Unix timestamp (in seconds) when the delegation is no longer valid. Zero indicates no expiration.',
    0
  )
  .option(
    '-j, --json',
    'If set, output JSON suitable to spread into the `headers` field of a `fetch` request.'
  )
  .action(Bridge.generateTokens)

cli
  .command('delegation create <audience-did>')
  .describe(
    'Output a CAR encoded UCAN that delegates capabilities to the audience for the current space.'
  )
  .option('-c, --can', 'One or more abilities to delegate.')
  .option(
    '-n, --name',
    'Human readable name for the audience receiving the delegation.'
  )
  .option(
    '-t, --type',
    'Type of the audience receiving the delegation, one of: device, app, service.'
  )
  .option(
    '-e, --expiration',
    'Unix timestamp when the delegation is no longer valid. Zero indicates no expiration.',
    0
  )
  .option(
    '-o, --output',
    'Path of file to write the exported delegation data to.'
  )
  .option(
    '--base64',
    'Format as base64 identity CID string. Useful when saving it as an environment variable.'
  )
  .action(createDelegation)

cli
  .command('delegation ls')
  .describe('List delegations created by this agent for others.')
  .option('--json', 'Format as newline delimited JSON')
  .action(listDelegations)

cli
  .command('delegation revoke <delegation-cid>')
  .describe('Revoke a delegation by CID.')
  .option(
    '-p, --proof',
    'Name of a file containing the delegation and any additional proofs needed to prove authority to revoke'
  )
  .action(revokeDelegation)

cli
  .command('proof add <proof>')
  .describe('Add a proof delegated to this agent.')
  .option('--json', 'Format as newline delimited JSON')
  .option('--dry-run', 'Decode and view the proof but do not add it')
  .action(addProof)

cli
  .command('proof ls')
  .describe('List proofs of capabilities delegated to this agent.')
  .option('--json', 'Format as newline delimited JSON')
  .action(listProofs)

cli
  .command('usage report')
  .describe('Display report of current space usage in bytes.')
  .option('--human', 'Format human readable values.', false)
  .option('--json', 'Format as newline delimited JSON', false)
  .action(usageReport)

cli
  .command('can access claim')
  .describe('Claim delegated capabilities for the authorized account.')
  .action(accessClaim)

cli
  .command('can blob add [data-path]')
  .describe('Store a blob with the service.')
  .action(blobAdd)

cli
  .command('can blob ls')
  .describe('List blobs in the current space.')
  .option('--json', 'Format as newline delimited JSON')
  .option('--size', 'The desired number of results to return')
  .option(
    '--cursor',
    'An opaque string included in a prior blob/list response that allows the service to provide the next "page" of results'
  )
  .action(blobList)

cli
  .command('can blob rm <multihash>')
  .describe('Remove a blob from the store by base58btc encoded multihash.')
  .action(blobRemove)

cli
  .command('can index add <cid>')
  .describe('Register an "index" with the service.')
  .action(indexAdd)

cli
  .command('can upload add <root-cid> <shard-cid>')
  .describe(
    'Register an upload - a DAG with the given root data CID that is stored in the given CAR shard(s), identified by CAR CIDs.'
  )
  .action(uploadAdd)

cli
  .command('can upload ls')
  .describe('List uploads in the current space.')
  .option('--json', 'Format as newline delimited JSON')
  .option('--shards', 'Pretty print with shards in output')
  .option('--size', 'The desired number of results to return')
  .option(
    '--cursor',
    'An opaque string included in a prior upload/list response that allows the service to provide the next "page" of results'
  )
  .option('--pre', 'If true, return the page of results preceding the cursor')
  .action(uploadList)

cli
  .command('can upload rm <root-cid>')
  .describe('Remove an upload from the uploads listing.')
  .action(uploadRemove)

cli
  .command('can filecoin info <piece-cid>')
  .describe('Get filecoin information for given PieceCid.')
  .action(filecoinInfo)

cli
  .command('key create')
  .describe(
    'Generate and print a new ed25519 key pair. Does not change your current signing key.'
  )
  .option('--json', 'output as json')
  .action(createKey)

cli
  .command('reset')
  .describe(
    'Remove all proofs/delegations from the store but retain the agent DID.'
  )
  .action(reset)

// show help text if no command provided
cli.command('help [cmd]', 'Show help text', { default: true }).action((cmd) => {
  try {
    cli.help(cmd)
  } catch (err) {
    console.log(`
ERROR
  Invalid command: ${cmd}
  
Run \`$ storacha --help\` for more info.
`)
    process.exit(1)
  }
})

cli.parse(process.argv)
