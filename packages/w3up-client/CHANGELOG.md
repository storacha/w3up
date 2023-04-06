# Changelog

## [5.5.1](https://github.com/web3-storage/w3up/compare/w3up-client-v5.5.0...w3up-client-v5.5.1) (2023-04-06)


### Bug Fixes

* add newline to space.js to test release-please 694 fix ([#696](https://github.com/web3-storage/w3up/issues/696)) ([ea18619](https://github.com/web3-storage/w3up/commit/ea186193575dc1e19d01fcecddf91c0df37376cc))

## [5.5.0](https://github.com/web3-storage/w3protocol/compare/w3up-client-v5.4.0...w3up-client-v5.5.0) (2023-03-29)


### Features

* add capabilities option type for authorize ([#687](https://github.com/web3-storage/w3protocol/issues/687)) ([bf262dd](https://github.com/web3-storage/w3protocol/commit/bf262dd4380ce2564b4d0afc6aa41b47da2fb36d))
* get `access/claim` authorization wait function working ([#666](https://github.com/web3-storage/w3protocol/issues/666)) ([83971de](https://github.com/web3-storage/w3protocol/commit/83971de683b5fccbbc7ae36b7cb34d62a9930349))


### Bug Fixes

* missing file from byo principal ([6b2384e](https://github.com/web3-storage/w3protocol/commit/6b2384e45eba08a5d7a35a052d451e1cac33ff0b))

## [5.4.0](https://github.com/web3-storage/w3protocol/compare/w3up-client-v5.3.0...w3up-client-v5.4.0) (2023-03-29)


### Features

* bring your own principal ([#672](https://github.com/web3-storage/w3protocol/issues/672)) ([4586df2](https://github.com/web3-storage/w3protocol/commit/4586df25fc8b43dab0191c77ef70620fbf276e1c))

## [5.3.0](https://github.com/web3-storage/w3protocol/compare/w3up-client-v5.2.0...w3up-client-v5.3.0) (2023-03-28)


### Features

* expose `onDirectoryEntryLink` option ([#663](https://github.com/web3-storage/w3protocol/issues/663)) ([e96c8ef](https://github.com/web3-storage/w3protocol/commit/e96c8efecc09bba5756c608a1edd4e52340cd37c))

## [5.2.0](https://github.com/web3-storage/w3protocol/compare/w3up-client-v5.1.0...w3up-client-v5.2.0) (2023-03-28)


### Features

* add w3up-client at /packages/w3up-client ([#653](https://github.com/web3-storage/w3protocol/issues/653)) ([ca921ec](https://github.com/web3-storage/w3protocol/commit/ca921ec2d6fb99d5d3db44f1d5ce77e1fe3dd7dd))


### Miscellaneous Chores

* **access-client:** release 11.0.0-rc.0 ([#573](https://github.com/web3-storage/w3protocol/issues/573)) ([be4386d](https://github.com/web3-storage/w3protocol/commit/be4386d66ceea393f289adb3c79273c250542807))

## [5.1.0](https://github.com/web3-storage/w3up-client/compare/v5.0.0...v5.1.0) (2023-03-24)


### Features

* updated README instructions for MVP ([#85](https://github.com/web3-storage/w3up-client/issues/85)) ([0d0a038](https://github.com/web3-storage/w3up-client/commit/0d0a0389f0b6b29c843d5b28c3ea2d840d38120f))

## [5.0.0](https://github.com/web3-storage/w3up-client/compare/v4.3.0...v5.0.0) (2023-03-23)


### ⚠ BREAKING CHANGES

* updated access client dep ([#89](https://github.com/web3-storage/w3up-client/issues/89))

### Features

* add HAMT sharded directories support ([#87](https://github.com/web3-storage/w3up-client/issues/87)) ([a6673e9](https://github.com/web3-storage/w3up-client/commit/a6673e98f51dc1dc93e5e40ea752a5c10e46c159))
* updated access client dep ([#89](https://github.com/web3-storage/w3up-client/issues/89)) ([35f3964](https://github.com/web3-storage/w3up-client/commit/35f39640a62eaf9a2e6a81632e32cf1851d640b4))

## [4.3.0](https://github.com/web3-storage/w3up-client/compare/v4.2.0...v4.3.0) (2023-03-21)


### Features

* add authorize to client, register no longer needs email ([c9555d9](https://github.com/web3-storage/w3up-client/commit/c9555d92edb1ded9c7db81efcdd2c83331b52106))
* expose connection id did and add email back to registerSpace ([ee1cf3a](https://github.com/web3-storage/w3up-client/commit/ee1cf3a30a79a98c21f2e897d6a26e443b41390f))
* use new claimDelegations "use case" ([1659786](https://github.com/web3-storage/w3up-client/commit/1659786fd79da6292d3605c1ca09b80d94ac83ca))


### Bug Fixes

* back to 100% test coverage ([5ae7f1e](https://github.com/web3-storage/w3up-client/commit/5ae7f1e1d19f7eb95b13ed3bc491fc99e51296d0))
* keep casting defaultProvider() ([7b8c859](https://github.com/web3-storage/w3up-client/commit/7b8c8594abd1665b0c0061ab2eef233d6a0b6cdf))
* pass registerSpace default provider inferred from connection ([224f818](https://github.com/web3-storage/w3up-client/commit/224f818f45b3fa4778a659c4f95124c92534c354))
* typos ([52c648a](https://github.com/web3-storage/w3up-client/commit/52c648a525466e1d6e0619ed4ab663164a9b6a9d))
* typos ([52c648a](https://github.com/web3-storage/w3up-client/commit/52c648a525466e1d6e0619ed4ab663164a9b6a9d))
* update package-lock ([6aa7c47](https://github.com/web3-storage/w3up-client/commit/6aa7c4785ae2bc49039c326e02d1fd042460b83d))
* use released packages to green the build ([05881fc](https://github.com/web3-storage/w3up-client/commit/05881fce652a1bc964937bec9c0cdd20aa2204b2))
* warnings about uploads being public/permanent ([187228a](https://github.com/web3-storage/w3up-client/commit/187228a828ff357f3d1083738673c6a502f2aff9))

## [4.2.0](https://github.com/web3-storage/w3up-client/compare/v4.1.0...v4.2.0) (2023-02-15)


### Features

* update to latest dependencies ([f4da59e](https://github.com/web3-storage/w3up-client/commit/f4da59ec10d8f7e96857998d34672d8848652445))

## [4.1.0](https://github.com/web3-storage/w3up-client/compare/v4.0.1...v4.1.0) (2023-01-11)


### Features

* add CAR upload method ([#72](https://github.com/web3-storage/w3up-client/issues/72)) ([8b31255](https://github.com/web3-storage/w3up-client/commit/8b31255521e6fd875fe043b9c09b347759ebf315))

## [4.0.1](https://github.com/web3-storage/w3up-client/compare/v4.0.0...v4.0.1) (2022-12-14)


### Bug Fixes

* prod access service DID ([67a5d4c](https://github.com/web3-storage/w3up-client/commit/67a5d4c77eb054f5e0075137e77daed3337f35d2))

## [4.0.0](https://github.com/web3-storage/w3up-client/compare/v3.2.0...v4.0.0) (2022-12-14)


### ⚠ BREAKING CHANGES

* The client has been re-written as a wrapper around [access-client](https://www.npmjs.com/package/@web3-storage/access) and [upload-client](https://www.npmjs.com/package/@web3-storage/upload-client) and the API has changed. 
 
Migration notes:

* `client.account()` has been removed, use `client.currentSpace()`
* `client.exportDelegation()` has been removed, use `client.createDelegation()` and then call `export()` on the returned value and encode the returned blocks as a CAR file using the [`@ipld/car`](https://www.npmjs.com/package/@ipld/car) library.
* `client.identity()` has been removed, use `client.agent()` + `client.currentSpace()` + `client.delegations()`
* `client.importDelegation()` has been removed, use `client.addProof()` (for general delegations to your agent) or `client.addSpace()` (to add a proof and _also_ add the space to your list of spaces).
* `client.insights()` has been removed - this was never working
* `client.invoke()` has been removed
* `client.list()` has been removed, use `client.capability.upload.list()`
* `client.makeDelegation()` has been renamed and signature has changed, use `client.createDelegation()`
* `client.register()` has been removed, use `client.registerSpace()`
* `client.remove()` has been removed, use `client.capability.store.remove()`
* `client.removeUpload()` has been removed, use `client.capability.upload.remove()`
* `client.stat()` has been removed, use `client.capability.store.list()`
* `client.upload()` has been removed, use `client.capability.store.add()`
* `client.uploadAdd()` has been removed, use `client.capability.upload.add()`
* `client.whoami()` has been removed, use `client.capability.space.info()`

### Features

* consume upload and access client ([#58](https://github.com/web3-storage/w3up-client/issues/58)) ([7bd91d5](https://github.com/web3-storage/w3up-client/commit/7bd91d59da2b961a4227d9c062e74169e645a0bc))


### Bug Fixes

* release please package name ([3d00586](https://github.com/web3-storage/w3up-client/commit/3d0058658d4a0e819b2da49c7cea3d084b8bba1b))
* remove pnpm reference from deploy-docs workflow ([6807f5d](https://github.com/web3-storage/w3up-client/commit/6807f5d91366e24ffe28d3177540549efbf808ca))
