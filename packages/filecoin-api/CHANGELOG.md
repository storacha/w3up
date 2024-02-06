# Changelog

## [4.4.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.3.1...filecoin-api-v4.4.0) (2024-02-06)


### Features

* add support to prepend pieces while buffering to aggregate ([#1301](https://github.com/web3-storage/w3up/issues/1301)) ([dff1846](https://github.com/web3-storage/w3up/commit/dff1846ad8b6ff5bb9e5fd8ff71f79df5bf79e4d))

## [4.3.1](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.3.0...filecoin-api-v4.3.1) (2024-01-15)


### Fixes

* avoid duplicates on aggregator buffer concat ([#1259](https://github.com/web3-storage/w3up/issues/1259)) ([9e64bab](https://github.com/web3-storage/w3up/commit/9e64babe93edeb474fc740d9be74c709d47bed1a))

## [4.3.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.2.0...filecoin-api-v4.3.0) (2023-11-29)


### Features

* move aggregate information out of deals in filecoin/info ([#1192](https://github.com/web3-storage/w3up/issues/1192)) ([18dc590](https://github.com/web3-storage/w3up/commit/18dc590ad50a023ef3094bfc1a2d729459e5d68e))

## [4.2.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.1.2...filecoin-api-v4.2.0) (2023-11-28)


### Features

* aggregator keeping oldest piece ts ([#1188](https://github.com/web3-storage/w3up/issues/1188)) ([97a7def](https://github.com/web3-storage/w3up/commit/97a7defa433b57591f23eddee692445437a718a1))


### Fixes

* package metadata ([#1161](https://github.com/web3-storage/w3up/issues/1161)) ([b8a1cc2](https://github.com/web3-storage/w3up/commit/b8a1cc2e125a91be582998bda295e1ae1caab087))
* storefront events cron with max concurrency ([#1191](https://github.com/web3-storage/w3up/issues/1191)) ([11010c9](https://github.com/web3-storage/w3up/commit/11010c94b9682e93b6209a169871021d37b76011))

## [4.1.2](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.1.1...filecoin-api-v4.1.2) (2023-11-16)


### Bug Fixes

* issue where typedoc docs would only show full docs for w3up-client ([#1141](https://github.com/web3-storage/w3up/issues/1141)) ([0b8d3f3](https://github.com/web3-storage/w3up/commit/0b8d3f3b52918b1b4d3b76ea6fea3fb0c837cd73))

## [4.1.1](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.1.0...filecoin-api-v4.1.1) (2023-11-15)


### Bug Fixes

* upgrade ucanto core ([#1127](https://github.com/web3-storage/w3up/issues/1127)) ([5ce4d22](https://github.com/web3-storage/w3up/commit/5ce4d2292d7e980da4a2ea0f1583f608a81157d2))

## [4.1.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.0.6...filecoin-api-v4.1.0) (2023-11-08)


### Features

* add usage/report capability ([#1079](https://github.com/web3-storage/w3up/issues/1079)) ([6418b4b](https://github.com/web3-storage/w3up/commit/6418b4b22329a118fb258928bd9a6a45ced5ce45))
* filecoin info ([#1091](https://github.com/web3-storage/w3up/issues/1091)) ([adb2442](https://github.com/web3-storage/w3up/commit/adb24424d1faf50daf2339b77c22fdd44faa236a))


### Bug Fixes

* lint ([#1095](https://github.com/web3-storage/w3up/issues/1095)) ([f9cc770](https://github.com/web3-storage/w3up/commit/f9cc77029d7c0651cb2961d08eca6f94dc1aef6c))

## [4.0.6](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.0.5...filecoin-api-v4.0.6) (2023-11-05)


### Bug Fixes

* revert enable storefront signer to be different from main service signer ([#1075](https://github.com/web3-storage/w3up/issues/1075)) ([80cdde0](https://github.com/web3-storage/w3up/commit/80cdde0f5b610cf6328dc17cb505759eddda821a))

## [4.0.5](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.0.4...filecoin-api-v4.0.5) (2023-11-04)


### Bug Fixes

* enable storefront signer to be different from main service signer ([#1072](https://github.com/web3-storage/w3up/issues/1072)) ([21ded3c](https://github.com/web3-storage/w3up/commit/21ded3c171ca66480e4f74329943527dcc2bac3e))

## [4.0.4](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.0.3...filecoin-api-v4.0.4) (2023-11-03)


### Bug Fixes

* dealer offer store keys without space ([#1066](https://github.com/web3-storage/w3up/issues/1066)) ([301f411](https://github.com/web3-storage/w3up/commit/301f411de74bca6b70c6b867c1bdc724a0a3af20))

## [4.0.3](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.0.2...filecoin-api-v4.0.3) (2023-11-03)


### Bug Fixes

* aggregate offer invocation cid wrong ([#1063](https://github.com/web3-storage/w3up/issues/1063)) ([90a5a4d](https://github.com/web3-storage/w3up/commit/90a5a4d815cff19d9421811a78dbefa01d486ebf))

## [4.0.2](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.0.1...filecoin-api-v4.0.2) (2023-11-03)


### Bug Fixes

* receipt chain has wrong CID because no expiration is set ([#1060](https://github.com/web3-storage/w3up/issues/1060)) ([dfb46d8](https://github.com/web3-storage/w3up/commit/dfb46d8185c684a18452e1325abcf74d59c48159))

## [4.0.1](https://github.com/web3-storage/w3up/compare/filecoin-api-v4.0.0...filecoin-api-v4.0.1) (2023-11-01)


### Bug Fixes

* storefront principal type on cron ([#1055](https://github.com/web3-storage/w3up/issues/1055)) ([3821804](https://github.com/web3-storage/w3up/commit/382180470add316dd48d01842f302e30edf870a0))

## [4.0.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.8...filecoin-api-v4.0.0) (2023-11-01)


### ⚠ BREAKING CHANGES

* add storefront filecoin api to upload api ([#1052](https://github.com/web3-storage/w3up/issues/1052))

### Features

* add storefront filecoin api to upload api ([#1052](https://github.com/web3-storage/w3up/issues/1052)) ([39916c2](https://github.com/web3-storage/w3up/commit/39916c25cbbfce6392fbb7cc71112987185c798c))

## [3.0.8](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.7...filecoin-api-v3.0.8) (2023-10-31)


### Bug Fixes

* aggregator events inclusion record type simplified ([#1050](https://github.com/web3-storage/w3up/issues/1050)) ([2131eac](https://github.com/web3-storage/w3up/commit/2131eac64c5225508be41ca3cba5f924cb1e596a))

## [3.0.7](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.6...filecoin-api-v3.0.7) (2023-10-31)


### Bug Fixes

* aggregator event tests ([#1048](https://github.com/web3-storage/w3up/issues/1048)) ([4263d12](https://github.com/web3-storage/w3up/commit/4263d12ad7eeb73ddd741752113c3babc93a3025))

## [3.0.6](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.5...filecoin-api-v3.0.6) (2023-10-30)


### Bug Fixes

* dealer aggregate store query type does not need aggregate anymore ([#1042](https://github.com/web3-storage/w3up/issues/1042)) ([0b3c1d0](https://github.com/web3-storage/w3up/commit/0b3c1d0b891208d035abdb5bf7bf43dba853d8a7))

## [3.0.5](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.4...filecoin-api-v3.0.5) (2023-10-30)


### Bug Fixes

* aggregate accept should rely on deal tracker response to issue receipt ([#1038](https://github.com/web3-storage/w3up/issues/1038)) ([42985ea](https://github.com/web3-storage/w3up/commit/42985ea526984dbc51d9afbdd1e1dc35a08c0639))
* aggregator service types have unused types ([#1039](https://github.com/web3-storage/w3up/issues/1039)) ([eba8e51](https://github.com/web3-storage/w3up/commit/eba8e514e90d266408b1271f438a339359206b1f))
* typo dealer event function name ([#1040](https://github.com/web3-storage/w3up/issues/1040)) ([7900624](https://github.com/web3-storage/w3up/commit/7900624469e3ec79f83adccd591e1c47a7034724))

## [3.0.4](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.3...filecoin-api-v3.0.4) (2023-10-27)


### Bug Fixes

* filecoin api test service context explicit exported ([#1034](https://github.com/web3-storage/w3up/issues/1034)) ([aeceec8](https://github.com/web3-storage/w3up/commit/aeceec8007426db9104b67fd68b2eace23bde0c5))

## [3.0.3](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.2...filecoin-api-v3.0.3) (2023-10-27)


### Bug Fixes

* trigger release filecoin api ([#1032](https://github.com/web3-storage/w3up/issues/1032)) ([7289a6b](https://github.com/web3-storage/w3up/commit/7289a6b2d735db76cd0159c5b7d9fc881ff0c903))

## [3.0.2](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.1...filecoin-api-v3.0.2) (2023-10-26)


### Bug Fixes

* aggregate accept must query with aggregate only ([#1024](https://github.com/web3-storage/w3up/issues/1024)) ([6fd909c](https://github.com/web3-storage/w3up/commit/6fd909ccdc108a83b3ea122e2d66b0663c6f3484))

## [3.0.1](https://github.com/web3-storage/w3up/compare/filecoin-api-v3.0.0...filecoin-api-v3.0.1) (2023-10-26)


### Bug Fixes

* filecoin api store has returns false ([#1022](https://github.com/web3-storage/w3up/issues/1022)) ([1960130](https://github.com/web3-storage/w3up/commit/1960130d2e39135b6b2327c08a9dae3cce59b2c3))

## [3.0.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v2.0.3...filecoin-api-v3.0.0) (2023-10-26)


### ⚠ BREAKING CHANGES

* upgrade data segment v4 ([#996](https://github.com/web3-storage/w3up/issues/996))

### Bug Fixes

* upgrade data segment v4 ([#996](https://github.com/web3-storage/w3up/issues/996)) ([348e4b0](https://github.com/web3-storage/w3up/commit/348e4b065909e48ab1e97c0eaee9fa0b5ad2e223))

## [2.0.3](https://github.com/web3-storage/w3up/compare/filecoin-api-v2.0.2...filecoin-api-v2.0.3) (2023-10-25)


### Bug Fixes

* fix arethetypesworking errors in all packages ([#1004](https://github.com/web3-storage/w3up/issues/1004)) ([2e2936a](https://github.com/web3-storage/w3up/commit/2e2936a3831389dd13be5be5146a04e2b15553c5))

## [2.0.2](https://github.com/web3-storage/w3up/compare/filecoin-api-v2.0.1...filecoin-api-v2.0.2) (2023-10-24)


### Bug Fixes

* export tests in lib for events ([#1001](https://github.com/web3-storage/w3up/issues/1001)) ([e442f32](https://github.com/web3-storage/w3up/commit/e442f32ce09d1457bc1df6c96ad006ec082d428d))

## [2.0.1](https://github.com/web3-storage/w3up/compare/filecoin-api-v2.0.0...filecoin-api-v2.0.1) (2023-10-24)


### Bug Fixes

* import exports and types ([#998](https://github.com/web3-storage/w3up/issues/998)) ([844d938](https://github.com/web3-storage/w3up/commit/844d93837f0ac503f93533899f22984a7b293cd2))

## [2.0.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.4.4...filecoin-api-v2.0.0) (2023-10-24)


### ⚠ BREAKING CHANGES

* see latest specs https://github.com/web3-storage/specs/blob/cbdb706f18567900c5c24d7fb16ccbaf93d0d023/w3-filecoin.md

### Features

* upgrade to ucanto@9 ([#951](https://github.com/web3-storage/w3up/issues/951)) ([d72faf1](https://github.com/web3-storage/w3up/commit/d72faf1bb07dd11462ae6dff8ee0469f8ae7e9e7))


### Bug Fixes

* upgrade ucanto in filecoin api ([c95fb54](https://github.com/web3-storage/w3up/commit/c95fb54cdb04f50ff78e5113e70d73c1cd6d8b47))


### Code Refactoring

* filecoin api services events and tests ([#974](https://github.com/web3-storage/w3up/issues/974)) ([953537b](https://github.com/web3-storage/w3up/commit/953537bcb98d94b9e9655797a7f9026643ab949f))

## [1.4.4](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.4.3...filecoin-api-v1.4.4) (2023-09-06)


### Bug Fixes

* aggregator queue must send storefront in queue message ([#901](https://github.com/web3-storage/w3up/issues/901)) ([e5873fb](https://github.com/web3-storage/w3up/commit/e5873fb5b2f929c7493480b30c034344ad766b1a))

## [1.4.3](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.4.2...filecoin-api-v1.4.3) (2023-09-01)


### Bug Fixes

* dealer test ([#897](https://github.com/web3-storage/w3up/issues/897)) ([5ae5eac](https://github.com/web3-storage/w3up/commit/5ae5eacc47440c5749f85751d496198e17cdb8da))

## [1.4.2](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.4.1...filecoin-api-v1.4.2) (2023-09-01)


### Bug Fixes

* rename dealer offer store ([#895](https://github.com/web3-storage/w3up/issues/895)) ([d3f8e06](https://github.com/web3-storage/w3up/commit/d3f8e06590c5608420d61e20b98007076da0b6f7))

## [1.4.1](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.4.0...filecoin-api-v1.4.1) (2023-08-31)


### Bug Fixes

* extend queue add errors ([#890](https://github.com/web3-storage/w3up/issues/890)) ([0ecd4bb](https://github.com/web3-storage/w3up/commit/0ecd4bb8db5c7e296f62ec1d48ecece6bcb4a8d5))

## [1.4.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.3.1...filecoin-api-v1.4.0) (2023-08-30)


### Features

* w3filecoin new client and api ([#848](https://github.com/web3-storage/w3up/issues/848)) ([7a58fbe](https://github.com/web3-storage/w3up/commit/7a58fbe8f6c6fbe98e700b7affd5825ddccf6547))


### Bug Fixes

* types when storefront is not in capability nb ([#886](https://github.com/web3-storage/w3up/issues/886)) ([448a7d1](https://github.com/web3-storage/w3up/commit/448a7d13ea3f90bc5ad6104a04c6d2f940b2817c))
* upgrade data segment ([#850](https://github.com/web3-storage/w3up/issues/850)) ([fba281f](https://github.com/web3-storage/w3up/commit/fba281f8cd3ce2a0a00ffd50a4a73d7701b489ce))
* w3filecoin spec separate capabilities to queue and enqueue ([#856](https://github.com/web3-storage/w3up/issues/856)) ([6bf9142](https://github.com/web3-storage/w3up/commit/6bf9142636fa65367faed8414c50beb9c1791726)), closes [#855](https://github.com/web3-storage/w3up/issues/855)

## [1.3.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.2.2...filecoin-api-v1.3.0) (2023-08-30)


### Features

* w3filecoin new client and api ([#848](https://github.com/web3-storage/w3up/issues/848)) ([7a58fbe](https://github.com/web3-storage/w3up/commit/7a58fbe8f6c6fbe98e700b7affd5825ddccf6547))


### Bug Fixes

* upgrade data segment ([#850](https://github.com/web3-storage/w3up/issues/850)) ([fba281f](https://github.com/web3-storage/w3up/commit/fba281f8cd3ce2a0a00ffd50a4a73d7701b489ce))
* w3filecoin spec separate capabilities to queue and enqueue ([#856](https://github.com/web3-storage/w3up/issues/856)) ([6bf9142](https://github.com/web3-storage/w3up/commit/6bf9142636fa65367faed8414c50beb9c1791726)), closes [#855](https://github.com/web3-storage/w3up/issues/855)

## [1.2.1](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.2.0...filecoin-api-v1.2.1) (2023-08-30)


### Bug Fixes

* w3filecoin spec separate capabilities to queue and enqueue ([#856](https://github.com/web3-storage/w3up/issues/856)) ([6bf9142](https://github.com/web3-storage/w3up/commit/6bf9142636fa65367faed8414c50beb9c1791726)), closes [#855](https://github.com/web3-storage/w3up/issues/855)

## [1.2.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.1.0...filecoin-api-v1.2.0) (2023-08-10)


### Features

* w3filecoin new client and api ([#848](https://github.com/web3-storage/w3up/issues/848)) ([7a58fbe](https://github.com/web3-storage/w3up/commit/7a58fbe8f6c6fbe98e700b7affd5825ddccf6547))


### Bug Fixes

* upgrade data segment ([#850](https://github.com/web3-storage/w3up/issues/850)) ([fba281f](https://github.com/web3-storage/w3up/commit/fba281f8cd3ce2a0a00ffd50a4a73d7701b489ce))

## 1.0.0 (2023-08-10)


### Features

* w3filecoin new client and api ([#848](https://github.com/web3-storage/w3up/issues/848)) ([7a58fbe](https://github.com/web3-storage/w3up/commit/7a58fbe8f6c6fbe98e700b7affd5825ddccf6547))


### Bug Fixes

* upgrade data segment ([#850](https://github.com/web3-storage/w3up/issues/850)) ([fba281f](https://github.com/web3-storage/w3up/commit/fba281f8cd3ce2a0a00ffd50a4a73d7701b489ce))

## [1.1.0](https://github.com/web3-storage/w3up/compare/filecoin-api-v1.0.0...filecoin-api-v1.1.0) (2023-08-09)


### Features

* w3filecoin new client and api ([#848](https://github.com/web3-storage/w3up/issues/848)) ([7a58fbe](https://github.com/web3-storage/w3up/commit/7a58fbe8f6c6fbe98e700b7affd5825ddccf6547))
