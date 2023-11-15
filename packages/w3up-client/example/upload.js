import * as Client from '../src/index.node.js'
import { filesFromPaths } from 'files-from-path'

/**
 * Usage:
 *   node upload.js <email> <space name> <path>
 */
const [,,email, spaceName, path] = process.argv

console.log({email, spaceName, path})

const client = await Client.create()

let space

// first time setup!
if (!client.accounts().length) {
  // waits for you to click the link in your email to verify your identity
  console.log('💌 sending a verification link to', email)
  const account = await client.login(email)

  // create a space for your uploads
  space = await client.createSpace(spaceName)
  console.log('✨ created space', space.did(), space.name)
  
  console.log('💾 saving space')
  await space.save()

  console.log('💳 provisioning space')
  // associate this space with your account
  await account.provision(space.did())
}

// content-address your files
const files = await filesFromPaths([path])
console.log('🚀 uploading', path)
const root = await client.uploadDirectory(files)

console.log('root', root.toString())

console.log('done!')
