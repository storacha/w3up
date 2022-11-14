#!/usr/bin/env node
import sade from 'sade'
import { NAME, pkg } from './config.js'
import { cmdAccountRegister } from './cmd-account-create.js'
import { cmdUpload } from './cmd-upload.js'

const prog = sade(NAME)

prog
  .version(pkg.version)
  .option('--profile', 'Profile to use', 'main')

prog
  .command('account register <email>')
  .describe('Register a new account.')
  .action(cmdAccountRegister)

prog
  .command('upload <path>')
  .describe('Upload a file or directory to web3.storage')
  .option('--no-wrap', 'Dont wrap input files with a directory')
  .option('-H, --hidden', 'Include paths that start with "."')
  .option('--no-retry', 'Don\'t try the upload again if it fails')
  .action(cmdUpload)

prog.parse(process.argv)
