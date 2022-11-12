#!/usr/bin/env node
import sade from 'sade'
import { cmdSetup } from '@web3-storage/access/cli/cmd-setup'
import { cmdCreateAccount } from '@web3-storage/access/cli/cmd-create-account'
import { NAME, pkg } from './config.js'
import { cmdUpload } from './cmd-upload.js'

const prog = sade(NAME)

prog
  .version(pkg.version)
  .option('--env', 'Env', 'staging')

prog
  .command('setup')
  .option('--reset', 'Reset current store.', false)
  .describe('Setup the web3.storage CLI tool.')
  .action(cmdSetup)

prog
  .command('account create')
  .describe('Create a new account.')
  .action(cmdCreateAccount)

prog
  .command('upload <path>')
  .describe('Upload a file or directory to web3.storage')
  .option('--no-wrap', 'Dont wrap input files with a directory')
  .option('-H, --hidden', 'Include paths that start with "."')
  .option('--no-retry', 'Don\'t try the upload again if it fails')
  .action(cmdUpload)

prog.parse(process.argv)
