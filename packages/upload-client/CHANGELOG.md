# Changelog

## [17.1.2](https://github.com/storacha/w3up/compare/upload-client-v17.1.1...upload-client-v17.1.2) (2024-12-05)


### Fixes

* retry when PUT request fails ([#1601](https://github.com/storacha/w3up/issues/1601)) ([be2f05f](https://github.com/storacha/w3up/commit/be2f05f99a0d1a074d6fe54db1c4fb11a1e0b37c))

## [17.1.1](https://github.com/storacha/w3up/compare/upload-client-v17.1.0...upload-client-v17.1.1) (2024-11-29)


### Fixes

* Find the receipts URL from the connection URL ([#1565](https://github.com/storacha/w3up/issues/1565)) ([3eb0f8e](https://github.com/storacha/w3up/commit/3eb0f8e31d92656fc65dc71f0b39f19478e8374e))
* overflow slices ([#1595](https://github.com/storacha/w3up/issues/1595)) ([0731582](https://github.com/storacha/w3up/commit/0731582b68d864a2d8f23b36008b8c64dbfa18fe))


### Other Changes

* **main:** release w3up-client 16.4.1 ([#1577](https://github.com/storacha/w3up/issues/1577)) ([1482d69](https://github.com/storacha/w3up/commit/1482d69c28baff1c27b1baf5f3e5c76f844e5576))

## [17.1.0](https://github.com/storacha/w3up/compare/upload-client-v17.0.1...upload-client-v17.1.0) (2024-10-24)


### Features

* usage/record capability definition ([#1562](https://github.com/storacha/w3up/issues/1562)) ([98c8a87](https://github.com/storacha/w3up/commit/98c8a87c52ef88da728225259e77f65733d2d7e6))


### Fixes

* repo URLs ([#1550](https://github.com/storacha/w3up/issues/1550)) ([e02ddf3](https://github.com/storacha/w3up/commit/e02ddf3696553b03f8d2f7316de0a99a9303a60f))


### Other Changes

* Add `pnpm dev` to watch-build all packages ([#1533](https://github.com/storacha/w3up/issues/1533)) ([07970ef](https://github.com/storacha/w3up/commit/07970efd443149158ebbfb2c4e745b5007eb9407))
* Warn if mocks aren't running ([#1534](https://github.com/storacha/w3up/issues/1534)) ([fb2fd66](https://github.com/storacha/w3up/commit/fb2fd66f906bde9dda7e49bb1ab214e5e980e7c5))

## [17.0.1](https://github.com/storacha-network/w3up/compare/upload-client-v17.0.0...upload-client-v17.0.1) (2024-06-20)


### Fixes

* missing typesVersions for fetch-with-upload-progress export ([b2f4508](https://github.com/storacha-network/w3up/commit/b2f4508727e4311fc626fc3c21b8a56a30caa3a0))

## [17.0.0](https://github.com/storacha-network/w3up/compare/upload-client-v16.1.1...upload-client-v17.0.0) (2024-06-19)


### ⚠ BREAKING CHANGES

* allow invocation configuration to be generated on demand ([#1507](https://github.com/storacha-network/w3up/issues/1507))

### Features

* allow invocation configuration to be generated on demand ([#1507](https://github.com/storacha-network/w3up/issues/1507)) ([fd74cbb](https://github.com/storacha-network/w3up/commit/fd74cbb9a59c10f1688a5994dd2cdc6722be00be))
* configure UnixFS encoder ([#1509](https://github.com/storacha-network/w3up/issues/1509)) ([1a5e648](https://github.com/storacha-network/w3up/commit/1a5e64817d20525c456b78eea22da8189b5748b1))


### Fixes

* stop writing to DUDEWHERE ([#1500](https://github.com/storacha-network/w3up/issues/1500)) ([cf0a1d6](https://github.com/storacha-network/w3up/commit/cf0a1d6e08d515854080899e57d16dca420f81e6))

## [16.1.1](https://github.com/w3s-project/w3up/compare/upload-client-v16.1.0...upload-client-v16.1.1) (2024-06-05)


### Fixes

* reuse http/put and blob/accept receipts when available ([#1495](https://github.com/w3s-project/w3up/issues/1495)) ([416802e](https://github.com/w3s-project/w3up/commit/416802e458734d638476078235526830dfdc21ca))

## [16.1.0](https://github.com/w3s-project/w3up/compare/upload-client-v16.0.2...upload-client-v16.1.0) (2024-06-04)


### Features

* add blob/get ([#1484](https://github.com/w3s-project/w3up/issues/1484)) ([328039d](https://github.com/w3s-project/w3up/commit/328039d8a29fec3c1bbab28d1bb9de1643f54f71))

## [16.0.2](https://github.com/w3s-project/w3up/compare/upload-client-v16.0.1...upload-client-v16.0.2) (2024-06-04)


### Fixes

* check for blob/accept receipts before blob/add is concluded ([#1459](https://github.com/w3s-project/w3up/issues/1459)) ([462518c](https://github.com/w3s-project/w3up/commit/462518ca832515c65cc674e8aef3c28f2228797d))

## [16.0.1](https://github.com/w3s-project/w3up/compare/upload-client-v16.0.0...upload-client-v16.0.1) (2024-05-30)


### Fixes

* rename blob and index client capabilities ([#1478](https://github.com/w3s-project/w3up/issues/1478)) ([17e3a31](https://github.com/w3s-project/w3up/commit/17e3a3161c6585b1844abcf7ed27252fa8580870))

## [16.0.0](https://github.com/w3s-project/w3up/compare/upload-client-v15.0.0...upload-client-v16.0.0) (2024-05-23)


### ⚠ BREAKING CHANGES

* **upload-api:** integrate agent store for idempotence & invocation/receipt persistence  ([#1444](https://github.com/w3s-project/w3up/issues/1444))

### Features

* **upload-api:** integrate agent store for idempotence & invocation/receipt persistence  ([#1444](https://github.com/w3s-project/w3up/issues/1444)) ([c9bf33e](https://github.com/w3s-project/w3up/commit/c9bf33e5512397a654db933a5e6b5db0c7c22da5))

## [15.0.0](https://github.com/w3s-project/w3up/compare/upload-client-v14.1.1...upload-client-v15.0.0) (2024-05-15)


### ⚠ BREAKING CHANGES

* delegated capabilities required to use `uploadFile`, `uploadDirectory` and `uploadCAR` have changed. In order to use these methods your agent will now need to be delegated `blob/add`, `index/add`, `filecoin/offer` and `upload/add` capabilities. Note: no code changes are required.

### Features

* generate sharded DAG index on client and invoke w `index/add` ([#1451](https://github.com/w3s-project/w3up/issues/1451)) ([a6d9026](https://github.com/w3s-project/w3up/commit/a6d9026536e60c0ce93b613acc6e337f2a21aeb2))

## [14.1.1](https://github.com/w3s-project/w3up/compare/upload-client-v14.1.0...upload-client-v14.1.1) (2024-05-15)


### Fixes

* revert blob add by default ([#1456](https://github.com/w3s-project/w3up/issues/1456)) ([b77ec75](https://github.com/w3s-project/w3up/commit/b77ec750c3911f6f47fa32a5e1560858b347985c))
* upload client export blob ([#1454](https://github.com/w3s-project/w3up/issues/1454)) ([5e55900](https://github.com/w3s-project/w3up/commit/5e55900870dcb72d7f53d0cd37990c8279b89b15))

## [14.1.0](https://github.com/w3s-project/w3up/compare/upload-client-v14.0.0...upload-client-v14.1.0) (2024-05-14)


### Features

* add blob protocol to upload-client ([#1425](https://github.com/w3s-project/w3up/issues/1425)) ([49aef56](https://github.com/w3s-project/w3up/commit/49aef564a726d34dbbedbd83f5366d9320180f99))


### Fixes

* cid for filecoin offer must be raw ([#1450](https://github.com/w3s-project/w3up/issues/1450)) ([c3dd7b5](https://github.com/w3s-project/w3up/commit/c3dd7b58e0f88f2d89d5ba12435339d839765e8c))


### Other Changes

* appease linter ([782c6d0](https://github.com/w3s-project/w3up/commit/782c6d0b3ca93ee801b38126339a262bcd713ede))

## [14.0.0](https://github.com/w3s-project/w3up/compare/upload-client-v13.2.2...upload-client-v14.0.0) (2024-04-29)


### ⚠ BREAKING CHANGES

* restrict store API to CARs ([#1415](https://github.com/w3s-project/w3up/issues/1415))

### Features

* restrict store API to CARs ([#1415](https://github.com/w3s-project/w3up/issues/1415)) ([e53aa87](https://github.com/w3s-project/w3up/commit/e53aa87780446458ef9a19c88877073c1470d50e))

## [13.2.2](https://github.com/w3s-project/w3up/compare/upload-client-v13.2.1...upload-client-v13.2.2) (2024-04-25)


### Fixes

* migrate repo ([#1389](https://github.com/w3s-project/w3up/issues/1389)) ([475a287](https://github.com/w3s-project/w3up/commit/475a28743ff9f7138b46dfe4227d3c80ed75a6a2))

## [13.2.1](https://github.com/web3-storage/w3up/compare/upload-client-v13.2.0...upload-client-v13.2.1) (2024-04-12)


### Fixes

* upgrade ucanto libs and format filecoin api ([#1359](https://github.com/web3-storage/w3up/issues/1359)) ([87ca098](https://github.com/web3-storage/w3up/commit/87ca098186fe204ff3409a2684719f1c54148c97))

## [13.2.0](https://github.com/web3-storage/w3up/compare/upload-client-v13.1.0...upload-client-v13.2.0) (2024-04-01)


### Features

* make it possible to disable piece hashing ([#1351](https://github.com/web3-storage/w3up/issues/1351)) ([adc498d](https://github.com/web3-storage/w3up/commit/adc498db8bd2b702695b186905bd510e73b99f6a))

## [13.1.0](https://github.com/web3-storage/w3up/compare/upload-client-v13.0.1...upload-client-v13.1.0) (2024-03-21)


### Features

* byo piece hasher ([#1323](https://github.com/web3-storage/w3up/issues/1323)) ([fe2e3d5](https://github.com/web3-storage/w3up/commit/fe2e3d5cdca8ba16eadafdc3c6eb2fed37118cd9))
* non-parallel piece hashing and CAR upload ([#1305](https://github.com/web3-storage/w3up/issues/1305)) ([7a6385b](https://github.com/web3-storage/w3up/commit/7a6385bef1dd424d5eb952528ae5d86a83837c80))
* upgrade ucanto/transport to 9.1.0 in all packages to get more verbose errors from HTTP transport on non-ok response ([#1312](https://github.com/web3-storage/w3up/issues/1312)) ([d6978d7](https://github.com/web3-storage/w3up/commit/d6978d7ab299be76987c6533d18e6857f6998fe6))


### Fixes

* upload client should perform filecoin offer ([#1333](https://github.com/web3-storage/w3up/issues/1333)) ([466e3f7](https://github.com/web3-storage/w3up/commit/466e3f79733c30f864cb21e7ed0f0684945417ed))

## [13.0.1](https://github.com/web3-storage/w3up/compare/upload-client-v13.0.0...upload-client-v13.0.1) (2024-02-01)


### Fixes

* update fr32 lib to support wasm import ([#1294](https://github.com/web3-storage/w3up/issues/1294)) ([4a00845](https://github.com/web3-storage/w3up/commit/4a00845bfaf9d1481501dc9f2c2c818aeee06dd6))
* upload client does not need cors mode on presigned url put ([#1295](https://github.com/web3-storage/w3up/issues/1295)) ([ef70a2b](https://github.com/web3-storage/w3up/commit/ef70a2b45d98583842c95980e5c6de5d20870e0d))

## [13.0.0](https://github.com/web3-storage/w3up/compare/upload-client-v12.3.2...upload-client-v13.0.0) (2023-12-14)


### ⚠ BREAKING CHANGES

* return allocated bytes in `store/add` receipt ([#1213](https://github.com/web3-storage/w3up/issues/1213))

### Features

* dont use ipfs-utils fetch with upload progress by default  ([#1240](https://github.com/web3-storage/w3up/issues/1240)) ([86aedbc](https://github.com/web3-storage/w3up/commit/86aedbcb070ae67093f30b2b724766dee4c43f2c))
* return allocated bytes in `store/add` receipt ([#1213](https://github.com/web3-storage/w3up/issues/1213)) ([5d52e44](https://github.com/web3-storage/w3up/commit/5d52e447c14e7f7fd334e7ff575e032b7b0d89d7))


### Fixes

* bind globalThis.fetch to globalThis ([#1242](https://github.com/web3-storage/w3up/issues/1242)) ([ef59358](https://github.com/web3-storage/w3up/commit/ef5935831eeedd35870a56abd2c7db2bcf47d1ca))
* point `main` at files included in the package ([#1241](https://github.com/web3-storage/w3up/issues/1241)) ([c0b306d](https://github.com/web3-storage/w3up/commit/c0b306df75b21d0979e407f04f0a23f67d5248af))

## [12.3.2](https://github.com/web3-storage/w3up/compare/upload-client-v12.3.1...upload-client-v12.3.2) (2023-12-07)


### Fixes

* memory usage ([#1227](https://github.com/web3-storage/w3up/issues/1227)) ([c9e7a49](https://github.com/web3-storage/w3up/commit/c9e7a49a32249408d89f8cdfe39433fdd9b6a527))

## [12.3.1](https://github.com/web3-storage/w3up/compare/upload-client-v12.3.0...upload-client-v12.3.1) (2023-12-07)


### Fixes

* revert "feat: upload-client funcs have options.piece to opt in to piece link calculation ([#1220](https://github.com/web3-storage/w3up/issues/1220)) ([#1224](https://github.com/web3-storage/w3up/issues/1224)) ([2f238bf](https://github.com/web3-storage/w3up/commit/2f238bfe9eb9d4c184737069c9ecea10a2c4f9b3))
* upgrade fr32-sha2-256-trunc-254-padded-binary-tree-multihash to 3.1.1. ([#1223](https://github.com/web3-storage/w3up/issues/1223)) ([0801d90](https://github.com/web3-storage/w3up/commit/0801d90a5acbdcca65e1afd8046021a01f8d60e8))

## [12.3.0](https://github.com/web3-storage/w3up/compare/upload-client-v12.2.0...upload-client-v12.3.0) (2023-12-06)


### Features

* upload-client funcs have options.piece to opt in to piece link calculation ([#1220](https://github.com/web3-storage/w3up/issues/1220)) ([c38000e](https://github.com/web3-storage/w3up/commit/c38000ecff19f9d402d1f1912e67153a0fe7284c))

## [12.2.0](https://github.com/web3-storage/w3up/compare/upload-client-v12.1.0...upload-client-v12.2.0) (2023-11-29)


### Features

* upload-client uploadDirectory, by default, sorts the provided files by file name to help the user call us in a way that is deterministic and minimizes cost ([#1173](https://github.com/web3-storage/w3up/issues/1173)) ([8cd2555](https://github.com/web3-storage/w3up/commit/8cd2555d901d7e684a9a5cc2516e5a91edd58621))


### Fixes

* floating promises and add no-floating-promises to eslint-config-w3up ([#1198](https://github.com/web3-storage/w3up/issues/1198)) ([1b8c5aa](https://github.com/web3-storage/w3up/commit/1b8c5aa86ec3d177bf77df4e2916699c1f522598))

## [12.1.0](https://github.com/web3-storage/w3up/compare/upload-client-v12.0.2...upload-client-v12.1.0) (2023-11-25)


### Features

* add store.get and upload.get to clients ([#1178](https://github.com/web3-storage/w3up/issues/1178)) ([d1be42a](https://github.com/web3-storage/w3up/commit/d1be42a642e04d290710e824dc4c9b924de8d8ac))

## [12.0.2](https://github.com/web3-storage/w3up/compare/upload-client-v12.0.1...upload-client-v12.0.2) (2023-11-22)


### Fixes

* package metadata ([#1161](https://github.com/web3-storage/w3up/issues/1161)) ([b8a1cc2](https://github.com/web3-storage/w3up/commit/b8a1cc2e125a91be582998bda295e1ae1caab087))

## [12.0.1](https://github.com/web3-storage/w3up/compare/upload-client-v12.0.0...upload-client-v12.0.1) (2023-11-16)


### Bug Fixes

* issue where typedoc docs would only show full docs for w3up-client ([#1141](https://github.com/web3-storage/w3up/issues/1141)) ([0b8d3f3](https://github.com/web3-storage/w3up/commit/0b8d3f3b52918b1b4d3b76ea6fea3fb0c837cd73))

## [12.0.0](https://github.com/web3-storage/w3up/compare/upload-client-v11.2.0...upload-client-v12.0.0) (2023-11-09)


### ⚠ BREAKING CHANGES

* tweak readmes to get release-please to bump major version ([#1102](https://github.com/web3-storage/w3up/issues/1102))

### Features

* tweak readmes to get release-please to bump major version ([#1102](https://github.com/web3-storage/w3up/issues/1102)) ([a411255](https://github.com/web3-storage/w3up/commit/a4112551f5dbac00f4b5a0da8c81ea35783f3ef9))

## [11.2.0](https://github.com/web3-storage/w3up/compare/upload-client-v11.1.0...upload-client-v11.2.0) (2023-11-08)


### Features

* add usage/report capability ([#1079](https://github.com/web3-storage/w3up/issues/1079)) ([6418b4b](https://github.com/web3-storage/w3up/commit/6418b4b22329a118fb258928bd9a6a45ced5ce45))

## [11.1.0](https://github.com/web3-storage/w3up/compare/upload-client-v11.0.0...upload-client-v11.1.0) (2023-10-30)


### Features

* upgrade fr32-sha2-256-trunc254-padded-binary-tree-multihash for async hasher ([#1044](https://github.com/web3-storage/w3up/issues/1044)) ([22ea6aa](https://github.com/web3-storage/w3up/commit/22ea6aa1a96e619d0f924c5bd60151866f8cc6df))

## [11.0.0](https://github.com/web3-storage/w3up/compare/upload-client-v10.1.0...upload-client-v11.0.0) (2023-10-27)


### ⚠ BREAKING CHANGES

* filecoin client to use new capabilities
* filecoin capabilities

### Bug Fixes

* add missing ContentNotFound definition for filecoin offer failure ([c0b97bf](https://github.com/web3-storage/w3up/commit/c0b97bf42d87b49d7de11119f9eb6166ab8d97d0))
* add missing filecoin submit success and failure types ([c0b97bf](https://github.com/web3-storage/w3up/commit/c0b97bf42d87b49d7de11119f9eb6166ab8d97d0))
* client tests ([b0d9c3f](https://github.com/web3-storage/w3up/commit/b0d9c3f258d37701487ef02f70a93e2dd1a18775))
* fix arethetypesworking errors in all packages ([#1004](https://github.com/web3-storage/w3up/issues/1004)) ([2e2936a](https://github.com/web3-storage/w3up/commit/2e2936a3831389dd13be5be5146a04e2b15553c5))
* package.json files excludes 'src' and includes .js and .js.map in dist for packages that now export their module from dist  ([#1012](https://github.com/web3-storage/w3up/issues/1012)) ([d2537de](https://github.com/web3-storage/w3up/commit/d2537deed533a39f39e312a1dfcfbd048e1d83e5))
* type errors ([c0b97bf](https://github.com/web3-storage/w3up/commit/c0b97bf42d87b49d7de11119f9eb6166ab8d97d0))
* upgrade fr32-sha2-256-trunc-254-padded-binary-tree-multihash ([#997](https://github.com/web3-storage/w3up/issues/997)) ([f6828ec](https://github.com/web3-storage/w3up/commit/f6828ecbcfe113d9e03e62ef65162b7d4e5774fd))


### Code Refactoring

* filecoin capabilities ([c0b97bf](https://github.com/web3-storage/w3up/commit/c0b97bf42d87b49d7de11119f9eb6166ab8d97d0))
* filecoin client to use new capabilities ([b0d9c3f](https://github.com/web3-storage/w3up/commit/b0d9c3f258d37701487ef02f70a93e2dd1a18775))

## [10.1.0](https://github.com/web3-storage/w3up/compare/upload-client-v10.0.1...upload-client-v10.1.0) (2023-10-20)


### Features

* add `store/get` and `upload/get` capabilities ([#942](https://github.com/web3-storage/w3up/issues/942)) ([40c79eb](https://github.com/web3-storage/w3up/commit/40c79eb8f246775b9e1828240f271fa75ef696be))

## [10.0.1](https://github.com/web3-storage/w3up/compare/upload-client-v10.0.0...upload-client-v10.0.1) (2023-10-19)


### Bug Fixes

* do not log warning on failed retry ([#976](https://github.com/web3-storage/w3up/issues/976)) ([25b51ce](https://github.com/web3-storage/w3up/commit/25b51ce0a384a3d4ffc65fc5469a0f98e91a8507))

## [10.0.0](https://github.com/web3-storage/w3up/compare/upload-client-v9.4.1...upload-client-v10.0.0) (2023-10-18)


### ⚠ BREAKING CHANGES

* Returning the `size` means that we need to fetch the stored item beforehand, and if it does not exist throw a `StoreItemNotFound` error. This is a change from the current behaviour which returns successfully even if the item is not present in the space.

### Features

* add size to `store/remove` receipt ([#969](https://github.com/web3-storage/w3up/issues/969)) ([d2100eb](https://github.com/web3-storage/w3up/commit/d2100eb0ffa5968c326d58d583a258187f9119eb))
* upgrade to ucanto@9 ([#951](https://github.com/web3-storage/w3up/issues/951)) ([d72faf1](https://github.com/web3-storage/w3up/commit/d72faf1bb07dd11462ae6dff8ee0469f8ae7e9e7))


### Bug Fixes

* upgrade to latest ts ([#962](https://github.com/web3-storage/w3up/issues/962)) ([711e3f7](https://github.com/web3-storage/w3up/commit/711e3f73f6905fde0d929952fff70be845a55fa1))

## [9.4.1](https://github.com/web3-storage/w3up/compare/upload-client-v9.4.0...upload-client-v9.4.1) (2023-10-06)


### Bug Fixes

* a couple URLs in the README ([#947](https://github.com/web3-storage/w3up/issues/947)) ([c948321](https://github.com/web3-storage/w3up/commit/c94832107ba46ad1811348645b73704d609e7055))

## [9.4.0](https://github.com/web3-storage/w3up/compare/upload-client-v9.3.0...upload-client-v9.4.0) (2023-09-20)


### Features

* add piece CID to car metadata ([1e52687](https://github.com/web3-storage/w3up/commit/1e52687020ea01c661d3acb612380c80f61d2b6a))

## [9.3.0](https://github.com/web3-storage/w3up/compare/upload-client-v9.2.0...upload-client-v9.3.0) (2023-09-15)


### Features

* compute piece CID in client ([#925](https://github.com/web3-storage/w3up/issues/925)) ([2297f01](https://github.com/web3-storage/w3up/commit/2297f01a09cc14526c9e210b22e9420d698c5413))

## [9.2.0](https://github.com/web3-storage/w3up/compare/upload-client-v9.1.2...upload-client-v9.2.0) (2023-09-07)


### Features

* adjust shard size ([#908](https://github.com/web3-storage/w3up/issues/908)) ([944182a](https://github.com/web3-storage/w3up/commit/944182ae97c5e69899d6a307cd73683852fb89dd))

## [9.1.2](https://github.com/web3-storage/w3up/compare/upload-client-v9.1.1...upload-client-v9.1.2) (2023-09-06)


### Bug Fixes

* revert workaround for bug in nodejs 20.5 ([#905](https://github.com/web3-storage/w3up/issues/905)) ([a47ddd9](https://github.com/web3-storage/w3up/commit/a47ddd92e696c5e751778abbf4241bea52ceea9c))

## [9.1.1](https://github.com/web3-storage/w3up/compare/upload-client-v9.1.0...upload-client-v9.1.1) (2023-07-25)


### Bug Fixes

* support for Node.js 20 ([#840](https://github.com/web3-storage/w3up/issues/840)) ([93e4d61](https://github.com/web3-storage/w3up/commit/93e4d612d3b700ffd8089908d6e6ce02aa342077))

## [9.1.0](https://github.com/web3-storage/w3up/compare/upload-client-v9.0.1...upload-client-v9.1.0) (2023-06-20)


### Features

* w3 aggregate protocol client and api implementation ([#787](https://github.com/web3-storage/w3up/issues/787)) ([b58069d](https://github.com/web3-storage/w3up/commit/b58069d7960efe09283f3b23fed77515b62d4639))

## [9.0.1](https://github.com/web3-storage/w3up/compare/upload-client-v9.0.0...upload-client-v9.0.1) (2023-05-23)


### Bug Fixes

* docs for `uploadCAR` return value ([#791](https://github.com/web3-storage/w3up/issues/791)) ([a5ceee4](https://github.com/web3-storage/w3up/commit/a5ceee4ed115bf4d784b99d814c522364fdb97e6))
* upgrade remaining ucanto deps ([#798](https://github.com/web3-storage/w3up/issues/798)) ([7211501](https://github.com/web3-storage/w3up/commit/72115010663a62140127cdeed21f2dc37f59da08))
* upgrade ucanto to 8 ([#794](https://github.com/web3-storage/w3up/issues/794)) ([00b011d](https://github.com/web3-storage/w3up/commit/00b011d87f628d4b3040398ca6cba567a69713ff))

## [9.0.0](https://github.com/web3-storage/w3up/compare/upload-client-v8.3.0...upload-client-v9.0.0) (2023-05-02)


### ⚠ BREAKING CHANGES

* upgrade to ucanto7.x.x ([#774](https://github.com/web3-storage/w3up/issues/774))

### Features

* upgrade to ucanto7.x.x ([#774](https://github.com/web3-storage/w3up/issues/774)) ([0cc6e66](https://github.com/web3-storage/w3up/commit/0cc6e66a80476e05c75bea94c1bee9bd12cbacf5))

## [8.3.0](https://github.com/web3-storage/w3up/compare/upload-client-v8.2.0...upload-client-v8.3.0) (2023-04-05)


### Features

* allow clients to pass uploadFile and uploadDirectory an onUploadProgress callback ([#720](https://github.com/web3-storage/w3up/issues/720)) ([b9247ad](https://github.com/web3-storage/w3up/commit/b9247ad6be952fdd1117510a9c5ba74153c6b1f4))

## [8.2.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v8.1.0...upload-client-v8.2.0) (2023-03-29)


### Features

* add w3up-client at /packages/w3up-client ([#653](https://github.com/web3-storage/w3protocol/issues/653)) ([ca921ec](https://github.com/web3-storage/w3protocol/commit/ca921ec2d6fb99d5d3db44f1d5ce77e1fe3dd7dd))


### Bug Fixes

* catch p-queue error on abort ([329de15](https://github.com/web3-storage/w3protocol/commit/329de1571fb3cea8ed1a6dca98249bad5d3b3018))

## [8.1.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v8.0.0...upload-client-v8.1.0) (2023-03-28)


### Features

* docs for DirectoryEntryLinkCallback ([50e5fa5](https://github.com/web3-storage/w3protocol/commit/50e5fa550b7659f0b2c545e26b792e0d871c6e88))

## [8.0.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v7.0.0...upload-client-v8.0.0) (2023-03-23)


### ⚠ BREAKING CHANGES

* implement new account-based multi-device flow ([#433](https://github.com/web3-storage/w3protocol/issues/433))

### Features

* add HAMT sharded directories support ([#536](https://github.com/web3-storage/w3protocol/issues/536)) ([8d98025](https://github.com/web3-storage/w3protocol/commit/8d98025012c87104db2910c315542d5c44bc637a))
* implement new account-based multi-device flow ([#433](https://github.com/web3-storage/w3protocol/issues/433)) ([1ddc6a0](https://github.com/web3-storage/w3protocol/commit/1ddc6a0c53f8cdb6837a315d8aaf567100dfb8d7))


### Miscellaneous Chores

* **access-client:** release 11.0.0-rc.0 ([#573](https://github.com/web3-storage/w3protocol/issues/573)) ([be4386d](https://github.com/web3-storage/w3protocol/commit/be4386d66ceea393f289adb3c79273c250542807))

## [7.0.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v6.0.0...upload-client-v7.0.0) (2023-03-08)


### ⚠ BREAKING CHANGES

* upgrade capabilities to latest ucanto ([#463](https://github.com/web3-storage/w3protocol/issues/463))

### Features

* upgrade capabilities to latest ucanto ([#463](https://github.com/web3-storage/w3protocol/issues/463)) ([2d786ee](https://github.com/web3-storage/w3protocol/commit/2d786ee81a6eb72c4782548ad3e3796fe3947fa5))
* upgrade to new ucanto ([#498](https://github.com/web3-storage/w3protocol/issues/498)) ([dcb41a9](https://github.com/web3-storage/w3protocol/commit/dcb41a9981c2b6bebbdbd29debcad9f510383680))

## [6.0.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v5.6.0...upload-client-v6.0.0) (2023-02-23)


### ⚠ BREAKING CHANGES

* rename startCursor and endCursor to before and after ([#442](https://github.com/web3-storage/w3protocol/issues/442))

### Features

* rename startCursor and endCursor to before and after ([#442](https://github.com/web3-storage/w3protocol/issues/442)) ([d4581a8](https://github.com/web3-storage/w3protocol/commit/d4581a80a91f1e6422a0d8eec2eb1403fbd34d90))

## [5.6.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v5.5.0...upload-client-v5.6.0) (2023-02-16)


### Features

* add startCursor and endCursor to ListResponse ([#437](https://github.com/web3-storage/w3protocol/issues/437)) ([8fa5672](https://github.com/web3-storage/w3protocol/commit/8fa56720fb7a60dfa9186dea7b61d60863402408))

## [5.5.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v5.4.0...upload-client-v5.5.0) (2023-02-10)


### Features

* add `pre` caveat to `store/list` and `upload/list` ([#423](https://github.com/web3-storage/w3protocol/issues/423)) ([a0f6d28](https://github.com/web3-storage/w3protocol/commit/a0f6d2834b900c4522fe71da473e4b43760502fd))

## [5.4.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v5.3.0...upload-client-v5.4.0) (2023-01-30)


### Features

* update @ucanto/* to ~4.2.3 ([#405](https://github.com/web3-storage/w3protocol/issues/405)) ([50c0c80](https://github.com/web3-storage/w3protocol/commit/50c0c80789c26b777e854b7208b7391499d2ef18))
* update access-api ucanto proxy to not need a signer ([#390](https://github.com/web3-storage/w3protocol/issues/390)) ([71cbeb7](https://github.com/web3-storage/w3protocol/commit/71cbeb718d0a5132b97efa1173a5aaf9c75cbe80))


### Bug Fixes

* use nullish coalescing for audience ([#319](https://github.com/web3-storage/w3protocol/issues/319)) ([a1d5ecf](https://github.com/web3-storage/w3protocol/commit/a1d5ecfb8a0cedc2bbd609907efab27297256fa8))

## [5.3.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v5.2.0...upload-client-v5.3.0) (2023-01-11)


### Features

* add uploadCAR function ([#329](https://github.com/web3-storage/w3protocol/issues/329)) ([6e40e47](https://github.com/web3-storage/w3protocol/commit/6e40e477903a68d0a339300357a57ec76de60394))
* embedded key resolution ([#312](https://github.com/web3-storage/w3protocol/issues/312)) ([4da91d5](https://github.com/web3-storage/w3protocol/commit/4da91d5f7f798d0d46c4df2aaf224610a8760d9e))


### Bug Fixes

* better upload-api service types ([#323](https://github.com/web3-storage/w3protocol/issues/323)) ([4cfe312](https://github.com/web3-storage/w3protocol/commit/4cfe312c9501c2c595a2c7f3fe768d58be1dbc7b))

## [5.2.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v5.1.0...upload-client-v5.2.0) (2022-12-14)


### Features

* update upload-client service conf ([#308](https://github.com/web3-storage/w3protocol/issues/308)) ([2cb590c](https://github.com/web3-storage/w3protocol/commit/2cb590c674a29fe040ca163c67766afb749ef337))


### Bug Fixes

* make d1 spaces.metadata nullable and change to kysely ([#284](https://github.com/web3-storage/w3protocol/issues/284)) ([c8a9ce5](https://github.com/web3-storage/w3protocol/commit/c8a9ce544226b3c8456d45b15e29cec84894aeb8)), closes [#280](https://github.com/web3-storage/w3protocol/issues/280)

## [5.1.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v5.0.0...upload-client-v5.1.0) (2022-12-13)


### Features

* sync encode/decode delegations ([#276](https://github.com/web3-storage/w3protocol/issues/276)) ([ab981fb](https://github.com/web3-storage/w3protocol/commit/ab981fb6e33799153022c0f6d06c282917e7af7c))
* upload/remove returns removed item ([#289](https://github.com/web3-storage/w3protocol/issues/289)) ([5e6681f](https://github.com/web3-storage/w3protocol/commit/5e6681f4886dc4e50550f58bf795944d51023f71))

## [5.0.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v4.0.0...upload-client-v5.0.0) (2022-12-07)


### ⚠ BREAKING CHANGES

* upgrade access-api @ucanto/* and @ipld/dag-ucan major versions ([#246](https://github.com/web3-storage/w3protocol/issues/246))
* upload/list items have a shards array property ([#229](https://github.com/web3-storage/w3protocol/issues/229))
* upgrade to `@ucanto/{interface,principal}`@^4.0.0 ([#238](https://github.com/web3-storage/w3protocol/issues/238))
* follow up on the capabilities extract ([#239](https://github.com/web3-storage/w3protocol/issues/239))
* rename callback ([#198](https://github.com/web3-storage/w3protocol/issues/198))

### Features

* [#153](https://github.com/web3-storage/w3protocol/issues/153) ([#177](https://github.com/web3-storage/w3protocol/issues/177)) ([d6d448c](https://github.com/web3-storage/w3protocol/commit/d6d448c16f188398c30f2d1b83f69e1d7becd450))
* a base for a new web3.storage upload-client ([#141](https://github.com/web3-storage/w3protocol/issues/141)) ([9d4b5be](https://github.com/web3-storage/w3protocol/commit/9d4b5bec1f0e870233b071ecb1c7a1e09189624b))
* **access-client:** cli and recover ([#207](https://github.com/web3-storage/w3protocol/issues/207)) ([adb3a8d](https://github.com/web3-storage/w3protocol/commit/adb3a8d61d42b31f106e86b95faa3e442f5dc2c7))
* account recover with email ([#149](https://github.com/web3-storage/w3protocol/issues/149)) ([6c659ba](https://github.com/web3-storage/w3protocol/commit/6c659ba68d23c3448d5150bc76f1ddcb91ae18d8))
* add static uploads API ([#148](https://github.com/web3-storage/w3protocol/issues/148)) ([d85d051](https://github.com/web3-storage/w3protocol/commit/d85d0515c80b14d97844fe68266f4fb637b6ba76))
* allow custom shard size ([#185](https://github.com/web3-storage/w3protocol/issues/185)) ([0cada8a](https://github.com/web3-storage/w3protocol/commit/0cada8af91bff96f93a87ffcc155efc176aa2a60))
* explicit resource ([#181](https://github.com/web3-storage/w3protocol/issues/181)) ([785924b](https://github.com/web3-storage/w3protocol/commit/785924ba94f4bc6696a5a9e3a0b66a2447f179f1))
* follow up on the capabilities extract ([#239](https://github.com/web3-storage/w3protocol/issues/239)) ([ef5e779](https://github.com/web3-storage/w3protocol/commit/ef5e77922b67155f0c3e5cb37c12e32f9a56cce1))
* Revert "feat!: upgrade to `@ucanto/{interface,principal}`@^4.0.0" ([#245](https://github.com/web3-storage/w3protocol/issues/245)) ([c182bbe](https://github.com/web3-storage/w3protocol/commit/c182bbe5e8c5a7d5c74b10cbf4b7a45b51e9b184))
* support pagination ([#204](https://github.com/web3-storage/w3protocol/issues/204)) ([a5296a6](https://github.com/web3-storage/w3protocol/commit/a5296a6dcaf02840ae9914c2a22090f0c6da017a)), closes [#201](https://github.com/web3-storage/w3protocol/issues/201)
* upgrade access-api @ucanto/* and @ipld/dag-ucan major versions ([#246](https://github.com/web3-storage/w3protocol/issues/246)) ([5e663d1](https://github.com/web3-storage/w3protocol/commit/5e663d12ccea7d21cc8e7c36869f144a08eaa1b0))
* upgrade to `@ucanto/{interface,principal}`@^4.0.0 ([#238](https://github.com/web3-storage/w3protocol/issues/238)) ([2f3bab8](https://github.com/web3-storage/w3protocol/commit/2f3bab8924fe7f34a5db64d2521730fc85739d3a))
* upload/list items have a shards array property ([#229](https://github.com/web3-storage/w3protocol/issues/229)) ([c00da35](https://github.com/web3-storage/w3protocol/commit/c00da35115b3ff767ba4f68ced471e42ec8b92e6))


### Bug Fixes

* export types ([c8d0a3f](https://github.com/web3-storage/w3protocol/commit/c8d0a3fa39dd8eae1bb125a4b150280ea0f4be0d))
* list response results return type ([#206](https://github.com/web3-storage/w3protocol/issues/206)) ([4bca6c1](https://github.com/web3-storage/w3protocol/commit/4bca6c10657c084f59a0b10ba74072b38266c922))
* store export ([#197](https://github.com/web3-storage/w3protocol/issues/197)) ([9b836e6](https://github.com/web3-storage/w3protocol/commit/9b836e607a9339cac41f75bfa09c36dc0f3d6874))
* upload client list needs empty nb ([#194](https://github.com/web3-storage/w3protocol/issues/194)) ([ff7fbb8](https://github.com/web3-storage/w3protocol/commit/ff7fbb82913e0ef64e9439bb3444e37b331eb483))
* uploadFile requires BlobLike not Blob ([1cc7681](https://github.com/web3-storage/w3protocol/commit/1cc768167f834af63d34c421aa62726ee3f2ed31))


### Code Refactoring

* rename callback ([#198](https://github.com/web3-storage/w3protocol/issues/198)) ([5b8ef7d](https://github.com/web3-storage/w3protocol/commit/5b8ef7d18b9c6472f1a24384558ae48d31358000))

## [4.0.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v3.0.0...upload-client-v4.0.0) (2022-12-07)


### ⚠ BREAKING CHANGES

* upgrade access-api @ucanto/* and @ipld/dag-ucan major versions ([#246](https://github.com/web3-storage/w3protocol/issues/246))

### Features

* upgrade access-api @ucanto/* and @ipld/dag-ucan major versions ([#246](https://github.com/web3-storage/w3protocol/issues/246)) ([5e663d1](https://github.com/web3-storage/w3protocol/commit/5e663d12ccea7d21cc8e7c36869f144a08eaa1b0))

## [3.0.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v2.1.0...upload-client-v3.0.0) (2022-12-06)


### ⚠ BREAKING CHANGES

* upload/list items have a shards array property ([#229](https://github.com/web3-storage/w3protocol/issues/229))
* upgrade to `@ucanto/{interface,principal}`@^4.0.0 ([#238](https://github.com/web3-storage/w3protocol/issues/238))
* follow up on the capabilities extract ([#239](https://github.com/web3-storage/w3protocol/issues/239))

### Features

* **access-client:** cli and recover ([#207](https://github.com/web3-storage/w3protocol/issues/207)) ([adb3a8d](https://github.com/web3-storage/w3protocol/commit/adb3a8d61d42b31f106e86b95faa3e442f5dc2c7))
* follow up on the capabilities extract ([#239](https://github.com/web3-storage/w3protocol/issues/239)) ([ef5e779](https://github.com/web3-storage/w3protocol/commit/ef5e77922b67155f0c3e5cb37c12e32f9a56cce1))
* Revert "feat!: upgrade to `@ucanto/{interface,principal}`@^4.0.0" ([#245](https://github.com/web3-storage/w3protocol/issues/245)) ([c182bbe](https://github.com/web3-storage/w3protocol/commit/c182bbe5e8c5a7d5c74b10cbf4b7a45b51e9b184))
* upgrade to `@ucanto/{interface,principal}`@^4.0.0 ([#238](https://github.com/web3-storage/w3protocol/issues/238)) ([2f3bab8](https://github.com/web3-storage/w3protocol/commit/2f3bab8924fe7f34a5db64d2521730fc85739d3a))
* upload/list items have a shards array property ([#229](https://github.com/web3-storage/w3protocol/issues/229)) ([c00da35](https://github.com/web3-storage/w3protocol/commit/c00da35115b3ff767ba4f68ced471e42ec8b92e6))


### Bug Fixes

* list response results return type ([#206](https://github.com/web3-storage/w3protocol/issues/206)) ([4bca6c1](https://github.com/web3-storage/w3protocol/commit/4bca6c10657c084f59a0b10ba74072b38266c922))

## [2.1.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v2.0.0...upload-client-v2.1.0) (2022-11-23)


### Features

* support pagination ([#204](https://github.com/web3-storage/w3protocol/issues/204)) ([a5296a6](https://github.com/web3-storage/w3protocol/commit/a5296a6dcaf02840ae9914c2a22090f0c6da017a)), closes [#201](https://github.com/web3-storage/w3protocol/issues/201)

## [2.0.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v1.1.1...upload-client-v2.0.0) (2022-11-22)


### ⚠ BREAKING CHANGES

* rename callback (#198)

### Features

* [#153](https://github.com/web3-storage/w3protocol/issues/153) ([#177](https://github.com/web3-storage/w3protocol/issues/177)) ([d6d448c](https://github.com/web3-storage/w3protocol/commit/d6d448c16f188398c30f2d1b83f69e1d7becd450))


### Bug Fixes

* export types ([c8d0a3f](https://github.com/web3-storage/w3protocol/commit/c8d0a3fa39dd8eae1bb125a4b150280ea0f4be0d))
* store export ([#197](https://github.com/web3-storage/w3protocol/issues/197)) ([9b836e6](https://github.com/web3-storage/w3protocol/commit/9b836e607a9339cac41f75bfa09c36dc0f3d6874))
* upload client list needs empty nb ([#194](https://github.com/web3-storage/w3protocol/issues/194)) ([ff7fbb8](https://github.com/web3-storage/w3protocol/commit/ff7fbb82913e0ef64e9439bb3444e37b331eb483))


### Code Refactoring

* rename callback ([#198](https://github.com/web3-storage/w3protocol/issues/198)) ([5b8ef7d](https://github.com/web3-storage/w3protocol/commit/5b8ef7d18b9c6472f1a24384558ae48d31358000))

## [1.1.1](https://github.com/web3-storage/w3protocol/compare/upload-client-v1.1.0...upload-client-v1.1.1) (2022-11-18)


### Bug Fixes

* uploadFile requires BlobLike not Blob ([1cc7681](https://github.com/web3-storage/w3protocol/commit/1cc768167f834af63d34c421aa62726ee3f2ed31))

## [1.1.0](https://github.com/web3-storage/w3protocol/compare/upload-client-v1.0.0...upload-client-v1.1.0) (2022-11-18)


### Features

* account recover with email ([#149](https://github.com/web3-storage/w3protocol/issues/149)) ([6c659ba](https://github.com/web3-storage/w3protocol/commit/6c659ba68d23c3448d5150bc76f1ddcb91ae18d8))
* allow custom shard size ([#185](https://github.com/web3-storage/w3protocol/issues/185)) ([0cada8a](https://github.com/web3-storage/w3protocol/commit/0cada8af91bff96f93a87ffcc155efc176aa2a60))
* explicit resource ([#181](https://github.com/web3-storage/w3protocol/issues/181)) ([785924b](https://github.com/web3-storage/w3protocol/commit/785924ba94f4bc6696a5a9e3a0b66a2447f179f1))

## 1.0.0 (2022-11-16)


### Features

* a base for a new web3.storage upload-client ([#141](https://github.com/web3-storage/w3protocol/issues/141)) ([9d4b5be](https://github.com/web3-storage/w3protocol/commit/9d4b5bec1f0e870233b071ecb1c7a1e09189624b))
* add static uploads API ([#148](https://github.com/web3-storage/w3protocol/issues/148)) ([d85d051](https://github.com/web3-storage/w3protocol/commit/d85d0515c80b14d97844fe68266f4fb637b6ba76))
