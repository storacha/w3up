export default {
  files: [
    'test/**',
    '!test/utils/'
  ],
  extensions: {
    ts: 'module'
  },
  nodeArguments: [
    '--loader=ts-node/esm',
    // the following options lets us avoid file extensions in imports
    // per https://github.com/avajs/ava/blob/main/docs/recipes/typescript.md#for-packages-with-type-module
    '--experimental-specifier-resolution=node'
  ]
}
