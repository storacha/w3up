# Changelog

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
