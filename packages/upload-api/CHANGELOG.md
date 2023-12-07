# Changelog

## [8.0.0](https://github.com/web3-storage/w3up/compare/upload-api-v7.3.5...upload-api-v8.0.0) (2023-12-07)


### ⚠ BREAKING CHANGES

* return allocated bytes in `store/add` receipt ([#1213](https://github.com/web3-storage/w3up/issues/1213))

### Features

* return allocated bytes in `store/add` receipt ([#1213](https://github.com/web3-storage/w3up/issues/1213)) ([5d52e44](https://github.com/web3-storage/w3up/commit/5d52e447c14e7f7fd334e7ff575e032b7b0d89d7))

## [7.3.5](https://github.com/web3-storage/w3up/compare/upload-api-v7.3.4...upload-api-v7.3.5) (2023-11-29)


### Fixes

* floating promises and add no-floating-promises to eslint-config-w3up ([#1198](https://github.com/web3-storage/w3up/issues/1198)) ([1b8c5aa](https://github.com/web3-storage/w3up/commit/1b8c5aa86ec3d177bf77df4e2916699c1f522598))

## [7.3.4](https://github.com/web3-storage/w3up/compare/upload-api-v7.3.3...upload-api-v7.3.4) (2023-11-28)


### Fixes

* package metadata ([#1161](https://github.com/web3-storage/w3up/issues/1161)) ([b8a1cc2](https://github.com/web3-storage/w3up/commit/b8a1cc2e125a91be582998bda295e1ae1caab087))

## [7.3.3](https://github.com/web3-storage/w3up/compare/upload-api-v7.3.2...upload-api-v7.3.3) (2023-11-16)


### Bug Fixes

* issue where typedoc docs would only show full docs for w3up-client ([#1141](https://github.com/web3-storage/w3up/issues/1141)) ([0b8d3f3](https://github.com/web3-storage/w3up/commit/0b8d3f3b52918b1b4d3b76ea6fea3fb0c837cd73))
* upgrade @ucanto/validator with bugfix ([#1151](https://github.com/web3-storage/w3up/issues/1151)) ([d4e961b](https://github.com/web3-storage/w3up/commit/d4e961bab09e88245e7d9323146849271e78eb57))

## [7.3.2](https://github.com/web3-storage/w3up/compare/upload-api-v7.3.1...upload-api-v7.3.2) (2023-11-15)


### Bug Fixes

* upgrade ucanto core ([#1127](https://github.com/web3-storage/w3up/issues/1127)) ([5ce4d22](https://github.com/web3-storage/w3up/commit/5ce4d2292d7e980da4a2ea0f1583f608a81157d2))

## [7.3.1](https://github.com/web3-storage/w3up/compare/upload-api-v7.3.0...upload-api-v7.3.1) (2023-11-09)


### Bug Fixes

* trigger release for upload api ([#1107](https://github.com/web3-storage/w3up/issues/1107)) ([9930b10](https://github.com/web3-storage/w3up/commit/9930b10962d365303ae45467a44f414aeac3dccb))

## [7.3.0](https://github.com/web3-storage/w3up/compare/upload-api-v7.2.0...upload-api-v7.3.0) (2023-11-09)


### Features

* add `subscription/list` capability ([#1088](https://github.com/web3-storage/w3up/issues/1088)) ([471d7e5](https://github.com/web3-storage/w3up/commit/471d7e5db24e12a06c1c52ae76bf95ff9471bac8))
* filecoin info ([#1091](https://github.com/web3-storage/w3up/issues/1091)) ([adb2442](https://github.com/web3-storage/w3up/commit/adb24424d1faf50daf2339b77c22fdd44faa236a))


### Bug Fixes

* lint ([#1095](https://github.com/web3-storage/w3up/issues/1095)) ([f9cc770](https://github.com/web3-storage/w3up/commit/f9cc77029d7c0651cb2961d08eca6f94dc1aef6c))

## [7.2.0](https://github.com/web3-storage/w3up/compare/upload-api-v7.1.2...upload-api-v7.2.0) (2023-11-07)


### Features

* add usage/report capability ([#1079](https://github.com/web3-storage/w3up/issues/1079)) ([6418b4b](https://github.com/web3-storage/w3up/commit/6418b4b22329a118fb258928bd9a6a45ced5ce45))
* optionally require plans for provisioning ([#1087](https://github.com/web3-storage/w3up/issues/1087)) ([b24731b](https://github.com/web3-storage/w3up/commit/b24731b0bdde785eef7785468cc1f49b92af2563))

## [7.1.2](https://github.com/web3-storage/w3up/compare/upload-api-v7.1.1...upload-api-v7.1.2) (2023-11-05)


### Bug Fixes

* revert enable storefront signer to be different from main service signer ([#1075](https://github.com/web3-storage/w3up/issues/1075)) ([80cdde0](https://github.com/web3-storage/w3up/commit/80cdde0f5b610cf6328dc17cb505759eddda821a))

## [7.1.1](https://github.com/web3-storage/w3up/compare/upload-api-v7.1.0...upload-api-v7.1.1) (2023-11-04)


### Bug Fixes

* enable storefront signer to be different from main service signer ([#1072](https://github.com/web3-storage/w3up/issues/1072)) ([21ded3c](https://github.com/web3-storage/w3up/commit/21ded3c171ca66480e4f74329943527dcc2bac3e))

## [7.1.0](https://github.com/web3-storage/w3up/compare/upload-api-v7.0.0...upload-api-v7.1.0) (2023-11-03)


### Features

* access agent proofs method would fail to return some session proofs ([#1047](https://github.com/web3-storage/w3up/issues/1047)) ([d23a1c9](https://github.com/web3-storage/w3up/commit/d23a1c972f91b855ee91f862da15bab0e68cca0a))
* expose test context of upload-api ([#1069](https://github.com/web3-storage/w3up/issues/1069)) ([f0757d1](https://github.com/web3-storage/w3up/commit/f0757d15fbe653ae4914960ac401385afd752e57))

## [7.0.0](https://github.com/web3-storage/w3up/compare/upload-api-v6.3.0...upload-api-v7.0.0) (2023-11-01)


### ⚠ BREAKING CHANGES

* add storefront filecoin api to upload api ([#1052](https://github.com/web3-storage/w3up/issues/1052))

### Features

* add storefront filecoin api to upload api ([#1052](https://github.com/web3-storage/w3up/issues/1052)) ([39916c2](https://github.com/web3-storage/w3up/commit/39916c25cbbfce6392fbb7cc71112987185c798c))
* implement `plan/get` capability ([#1005](https://github.com/web3-storage/w3up/issues/1005)) ([f0456d2](https://github.com/web3-storage/w3up/commit/f0456d2e2aab462666810e22abd7dfb7e1ce21be))

## [6.3.0](https://github.com/web3-storage/w3up/compare/upload-api-v6.2.0...upload-api-v6.3.0) (2023-10-25)


### Features

* allow customers to create more than one space ([#989](https://github.com/web3-storage/w3up/issues/989)) ([06e0ca9](https://github.com/web3-storage/w3up/commit/06e0ca9fd3e34104002023f81fc605b666ef9a5b))


### Bug Fixes

* fix arethetypesworking errors in all packages ([#1004](https://github.com/web3-storage/w3up/issues/1004)) ([2e2936a](https://github.com/web3-storage/w3up/commit/2e2936a3831389dd13be5be5146a04e2b15553c5))

## [6.2.0](https://github.com/web3-storage/w3up/compare/upload-api-v6.1.0...upload-api-v6.2.0) (2023-10-20)


### Features

* add `store/get` and `upload/get` capabilities ([#942](https://github.com/web3-storage/w3up/issues/942)) ([40c79eb](https://github.com/web3-storage/w3up/commit/40c79eb8f246775b9e1828240f271fa75ef696be))

## [6.1.0](https://github.com/web3-storage/w3up/compare/upload-api-v6.0.0...upload-api-v6.1.0) (2023-10-19)


### Features

* add revocation to access-client and w3up-client ([#975](https://github.com/web3-storage/w3up/issues/975)) ([6c877aa](https://github.com/web3-storage/w3up/commit/6c877aac78eddb924e999dc3270cba010e48e30a))

## [6.0.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.9.0...upload-api-v6.0.0) (2023-10-13)


### ⚠ BREAKING CHANGES

* Returning the `size` means that we need to fetch the stored item beforehand, and if it does not exist throw a `StoreItemNotFound` error. This is a change from the current behaviour which returns successfully even if the item is not present in the space.

### Features

* add size to `store/remove` receipt ([#969](https://github.com/web3-storage/w3up/issues/969)) ([d2100eb](https://github.com/web3-storage/w3up/commit/d2100eb0ffa5968c326d58d583a258187f9119eb))

## [5.9.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.8.0...upload-api-v5.9.0) (2023-10-10)


### Features

* revocation handler ([#960](https://github.com/web3-storage/w3up/issues/960)) ([91f52c6](https://github.com/web3-storage/w3up/commit/91f52c6d35e4aea2a98c75d8b95ff61cdffac452))
* upgrade to ucanto@9 ([#951](https://github.com/web3-storage/w3up/issues/951)) ([d72faf1](https://github.com/web3-storage/w3up/commit/d72faf1bb07dd11462ae6dff8ee0469f8ae7e9e7))

## [5.8.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.7.0...upload-api-v5.8.0) (2023-10-06)


### Features

* Add basic README to upload-api ([#949](https://github.com/web3-storage/w3up/issues/949)) ([d09db73](https://github.com/web3-storage/w3up/commit/d09db734da5eec55d5a21106fecc07bddd5f14dc))

## [5.7.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.6.0...upload-api-v5.7.0) (2023-10-05)


### Features

* add `RevocationsStorage` ([#941](https://github.com/web3-storage/w3up/issues/941)) ([0069701](https://github.com/web3-storage/w3up/commit/0069701c76eff9ce0ac229658d217dac42d9adc8))

## [5.6.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.5.0...upload-api-v5.6.0) (2023-09-18)


### Features

* rename getCID to inspect ([#931](https://github.com/web3-storage/w3up/issues/931)) ([2f8dbe6](https://github.com/web3-storage/w3up/commit/2f8dbe6bfbfbac2e2f4b8819e5fa91f8141df1bf))

## [5.5.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.4.0...upload-api-v5.5.0) (2023-09-14)


### Features

* reorg tests ([#926](https://github.com/web3-storage/w3up/issues/926)) ([946db3c](https://github.com/web3-storage/w3up/commit/946db3c329c893139ee3e5eac640899796aa307c))

## [5.4.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.3.1...upload-api-v5.4.0) (2023-09-13)


### Features

* implement `admin/upload/inspect` and `admin/store/inspect` capabilities ([#918](https://github.com/web3-storage/w3up/issues/918)) ([5616a12](https://github.com/web3-storage/w3up/commit/5616a12125500a1d5ee41f0504812d82c0451852))

## [5.3.1](https://github.com/web3-storage/w3up/compare/upload-api-v5.3.0...upload-api-v5.3.1) (2023-09-12)


### Bug Fixes

* store add should validate size right away ([#917](https://github.com/web3-storage/w3up/issues/917)) ([2770e6c](https://github.com/web3-storage/w3up/commit/2770e6cfde60236b12d043caa72fd944f6b80918))

## [5.3.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.2.0...upload-api-v5.3.0) (2023-09-05)


### Features

* make agent Service generic ([#875](https://github.com/web3-storage/w3up/issues/875)) ([cdfe36d](https://github.com/web3-storage/w3up/commit/cdfe36dc7298e92066d0454144f598b0e0535b19))


### Bug Fixes

* add a test that exercises ProvisionsStorage#getConsumer ([#893](https://github.com/web3-storage/w3up/issues/893)) ([ed60572](https://github.com/web3-storage/w3up/commit/ed605725a71102b6584bb1c7039ee1a1f50dd7c6))

## [5.2.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.1.0...upload-api-v5.2.0) (2023-08-28)


### Features

* return ID from ProvisionsStorage `put` ([#869](https://github.com/web3-storage/w3up/issues/869)) ([d165c23](https://github.com/web3-storage/w3up/commit/d165c234d8ee6bf0fa31e954b3743d39c6d91699))

## [5.1.0](https://github.com/web3-storage/w3up/compare/upload-api-v5.0.0...upload-api-v5.1.0) (2023-08-22)


### Features

* add providers to space/info ([#862](https://github.com/web3-storage/w3up/issues/862)) ([ac72921](https://github.com/web3-storage/w3up/commit/ac7292177767e6456492200653f0a8b33a4cd98e))
* add subscriptions to CustomerGetSuccess ([#863](https://github.com/web3-storage/w3up/issues/863)) ([dd2e77c](https://github.com/web3-storage/w3up/commit/dd2e77c51d84a517cb50ff05199b8eebf9223bf2))
* change "total" to "limit" ([#867](https://github.com/web3-storage/w3up/issues/867)) ([8295070](https://github.com/web3-storage/w3up/commit/8295070c8fbbc508da2cfe6f32846090a530f282))


### Bug Fixes

* re-enable upload-api tests ([#864](https://github.com/web3-storage/w3up/issues/864)) ([d76a6af](https://github.com/web3-storage/w3up/commit/d76a6af5b48aae60e66f164f61f3c9e010395f29))

## [5.0.0](https://github.com/web3-storage/w3up/compare/upload-api-v4.1.0...upload-api-v5.0.0) (2023-08-09)


### ⚠ BREAKING CHANGES

* introduce new administrative capabilities ([#832](https://github.com/web3-storage/w3up/issues/832))

### Features

* introduce new administrative capabilities ([#832](https://github.com/web3-storage/w3up/issues/832)) ([7b8037a](https://github.com/web3-storage/w3up/commit/7b8037a6ab92f830af4aa7ba07a91bc2a20c0d8c))


### Bug Fixes

* run format for upload-api ([#825](https://github.com/web3-storage/w3up/issues/825)) ([59dc765](https://github.com/web3-storage/w3up/commit/59dc7659a6a19942fad5f73efbed84cc33381314))

## [4.1.0](https://github.com/web3-storage/w3up/compare/upload-api-v4.0.0...upload-api-v4.1.0) (2023-06-20)


### Features

* add failure type to DelegationsStorage#putMany return ([#819](https://github.com/web3-storage/w3up/issues/819)) ([ae7b7c6](https://github.com/web3-storage/w3up/commit/ae7b7c651b57cd514b9429677a420fd14237b8a8))

## [4.0.0](https://github.com/web3-storage/w3up/compare/upload-api-v3.0.0...upload-api-v4.0.0) (2023-06-08)


### ⚠ BREAKING CHANGES

* merge `@web3-storage/access-api` into `@web3-storage/upload-api` ([#790](https://github.com/web3-storage/w3up/issues/790))

### Features

* merge `@web3-storage/access-api` into `@web3-storage/upload-api` ([#790](https://github.com/web3-storage/w3up/issues/790)) ([4f6ddb6](https://github.com/web3-storage/w3up/commit/4f6ddb690c365a42a3dc4c5c6898e4999bd0f868))


### Bug Fixes

* upgrade remaining ucanto deps ([#798](https://github.com/web3-storage/w3up/issues/798)) ([7211501](https://github.com/web3-storage/w3up/commit/72115010663a62140127cdeed21f2dc37f59da08))
* upgrade ucanto to 8 ([#794](https://github.com/web3-storage/w3up/issues/794)) ([00b011d](https://github.com/web3-storage/w3up/commit/00b011d87f628d4b3040398ca6cba567a69713ff))
* use legacy codec on upload api ([#788](https://github.com/web3-storage/w3up/issues/788)) ([1514474](https://github.com/web3-storage/w3up/commit/151447414f79e9df5aba1873b962c9c2efed1935))
* use legacy codec on upload api ([#788](https://github.com/web3-storage/w3up/issues/788)) ([84a4d44](https://github.com/web3-storage/w3up/commit/84a4d440ffa0be1ea4962b32070c12b83cc95562))

## [3.0.0](https://github.com/web3-storage/w3up/compare/upload-api-v2.0.0...upload-api-v3.0.0) (2023-05-03)


### ⚠ BREAKING CHANGES

* upgrade to ucanto7.x.x ([#774](https://github.com/web3-storage/w3up/issues/774))

### Features

* upgrade to ucanto7.x.x ([#774](https://github.com/web3-storage/w3up/issues/774)) ([0cc6e66](https://github.com/web3-storage/w3up/commit/0cc6e66a80476e05c75bea94c1bee9bd12cbacf5))

## [2.0.0](https://github.com/web3-storage/w3protocol/compare/upload-api-v1.0.4...upload-api-v2.0.0) (2023-03-23)


### ⚠ BREAKING CHANGES

* ucan bucket is not part of upload-api but rather ucan-api
* implement new account-based multi-device flow ([#433](https://github.com/web3-storage/w3protocol/issues/433))

### Features

* implement new account-based multi-device flow ([#433](https://github.com/web3-storage/w3protocol/issues/433)) ([1ddc6a0](https://github.com/web3-storage/w3protocol/commit/1ddc6a0c53f8cdb6837a315d8aaf567100dfb8d7))


### Bug Fixes

* remove ucan bucket interface ([#594](https://github.com/web3-storage/w3protocol/issues/594)) ([52cf7c1](https://github.com/web3-storage/w3protocol/commit/52cf7c1f35f01aac66d475d884b87f29348a145c))


### Miscellaneous Chores

* **access-client:** release 11.0.0-rc.0 ([#573](https://github.com/web3-storage/w3protocol/issues/573)) ([be4386d](https://github.com/web3-storage/w3protocol/commit/be4386d66ceea393f289adb3c79273c250542807))

## [1.0.4](https://github.com/web3-storage/w3protocol/compare/upload-api-v1.0.3...upload-api-v1.0.4) (2023-03-08)


### Bug Fixes

* **upload-api:** include test types in the package ([#513](https://github.com/web3-storage/w3protocol/issues/513)) ([0c7a452](https://github.com/web3-storage/w3protocol/commit/0c7a452af99757aa34871c4d5c9d77938934892e))

## [1.0.3](https://github.com/web3-storage/w3protocol/compare/upload-api-v1.0.2...upload-api-v1.0.3) (2023-03-08)


### Bug Fixes

* switch upload-api to node16 ([#509](https://github.com/web3-storage/w3protocol/issues/509)) ([698a033](https://github.com/web3-storage/w3protocol/commit/698a03391221aceb1ce602c407587497d97a77ed))
* types so that w3infra would have been evident ([#507](https://github.com/web3-storage/w3protocol/issues/507)) ([544a838](https://github.com/web3-storage/w3protocol/commit/544a838fa16b316825f69fd95fcb5e35002ac958))

## [1.0.2](https://github.com/web3-storage/w3protocol/compare/upload-api-v1.0.1...upload-api-v1.0.2) (2023-03-08)


### Bug Fixes

* **upload-api:** fix incompatibilities with w3infra ([#504](https://github.com/web3-storage/w3protocol/issues/504)) ([d3dcf34](https://github.com/web3-storage/w3protocol/commit/d3dcf3493030abba62da2e16ffa52107e18d6fa8))

## [1.0.1](https://github.com/web3-storage/w3protocol/compare/upload-api-v1.0.0...upload-api-v1.0.1) (2023-03-08)


### Bug Fixes

* release upload api ([#501](https://github.com/web3-storage/w3protocol/issues/501)) ([23d536a](https://github.com/web3-storage/w3protocol/commit/23d536af6f323311721aecf75ca77b7a19f88643))

## 1.0.0 (2023-03-08)


### Features

* Migrate store/* & upload/* APIs ([#485](https://github.com/web3-storage/w3protocol/issues/485)) ([f0b1e73](https://github.com/web3-storage/w3protocol/commit/f0b1e737f4d2f1689c5da04ad5408b114928d2fe))
* upgrade to new ucanto ([#498](https://github.com/web3-storage/w3protocol/issues/498)) ([dcb41a9](https://github.com/web3-storage/w3protocol/commit/dcb41a9981c2b6bebbdbd29debcad9f510383680))
