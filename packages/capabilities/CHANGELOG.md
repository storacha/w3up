# Changelog

## [4.0.1](https://github.com/web3-storage/w3protocol/compare/capabilities-v4.0.0...capabilities-v4.0.1) (2023-03-27)


### Features

* allow multiple providers ([#595](https://github.com/web3-storage/w3protocol/issues/595)) ([96c5a2e](https://github.com/web3-storage/w3protocol/commit/96c5a2e5a03432d8483d044ae10f6f3e03c2710c))


### Miscellaneous Chores

* **access-client:** release 11.0.0-rc.0 ([#573](https://github.com/web3-storage/w3protocol/issues/573)) ([be4386d](https://github.com/web3-storage/w3protocol/commit/be4386d66ceea393f289adb3c79273c250542807))

## [4.0.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v3.2.0...capabilities-v4.0.0) (2023-03-17)


### ⚠ BREAKING CHANGES

* implement new account-based multi-device flow ([#433](https://github.com/web3-storage/w3protocol/issues/433))

### Features

* define `access/confirm` handler and use it in ucanto-test-utils registerSpaces + validate-email handler ([#530](https://github.com/web3-storage/w3protocol/issues/530)) ([b1bbc90](https://github.com/web3-storage/w3protocol/commit/b1bbc907c96cfc7788f50fb0c154d9b54894e03e))
* implement new account-based multi-device flow ([#433](https://github.com/web3-storage/w3protocol/issues/433)) ([1ddc6a0](https://github.com/web3-storage/w3protocol/commit/1ddc6a0c53f8cdb6837a315d8aaf567100dfb8d7))
* provision provider type is now the DID of the w3s service ([#528](https://github.com/web3-storage/w3protocol/issues/528)) ([6a72855](https://github.com/web3-storage/w3protocol/commit/6a72855db4d6e838e9948f3951fdb5ef324eec95))

## [3.2.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v3.1.0...capabilities-v3.2.0) (2023-03-08)


### Features

* upgrade to new ucanto ([#498](https://github.com/web3-storage/w3protocol/issues/498)) ([dcb41a9](https://github.com/web3-storage/w3protocol/commit/dcb41a9981c2b6bebbdbd29debcad9f510383680))

## [3.1.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v3.0.0...capabilities-v3.1.0) (2023-03-04)


### Features

* access-api handles provider/add invocations ([#462](https://github.com/web3-storage/w3protocol/issues/462)) ([5fb56f7](https://github.com/web3-storage/w3protocol/commit/5fb56f794529f3d4de2b4597c47503002767fabb))
* includes proofs chains in the delegated authorization chain ([#467](https://github.com/web3-storage/w3protocol/issues/467)) ([5144293](https://github.com/web3-storage/w3protocol/commit/5144293deabd9d5380448ae288e089ef2652def7))

## [3.0.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v2.3.0...capabilities-v3.0.0) (2023-03-01)


### ⚠ BREAKING CHANGES

* upgrade capabilities to latest ucanto ([#463](https://github.com/web3-storage/w3protocol/issues/463))

### Features

* handle access/delegate invocations without error ([#427](https://github.com/web3-storage/w3protocol/issues/427)) ([4f0bd1c](https://github.com/web3-storage/w3protocol/commit/4f0bd1c1cd3cfb1c848892ad418c6d7b2197045a))
* upgrade capabilities to latest ucanto ([#463](https://github.com/web3-storage/w3protocol/issues/463)) ([2d786ee](https://github.com/web3-storage/w3protocol/commit/2d786ee81a6eb72c4782548ad3e3796fe3947fa5))


### Bug Fixes

* allow injecting email ([#466](https://github.com/web3-storage/w3protocol/issues/466)) ([e19847f](https://github.com/web3-storage/w3protocol/commit/e19847fef804fed33f709ec8b78640fff21ca01e))

## [2.3.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v2.2.0...capabilities-v2.3.0) (2023-02-10)


### Features

* add `pre` caveat to `store/list` and `upload/list` ([#423](https://github.com/web3-storage/w3protocol/issues/423)) ([a0f6d28](https://github.com/web3-storage/w3protocol/commit/a0f6d2834b900c4522fe71da473e4b43760502fd))
* add access/delegate capability parser exported from @web3-storage/capabilities ([#420](https://github.com/web3-storage/w3protocol/issues/420)) ([e8e2b1a](https://github.com/web3-storage/w3protocol/commit/e8e2b1a7606ce82bc346517d875de5244d240229))
* add support for access/authorize and update ([#392](https://github.com/web3-storage/w3protocol/issues/392)) ([9c8ca0b](https://github.com/web3-storage/w3protocol/commit/9c8ca0b385c940c8f0c21ee9edde093d2dcab8b8)), closes [#386](https://github.com/web3-storage/w3protocol/issues/386)
* define access/claim in @web3-storage/capabilities ([#409](https://github.com/web3-storage/w3protocol/issues/409)) ([4d72ba3](https://github.com/web3-storage/w3protocol/commit/4d72ba3a1ce2564cda13c62137967613b18334a7))

## [2.2.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v2.1.0...capabilities-v2.2.0) (2023-01-30)


### Features

* access-api forwards store/ and upload/ invocations to upload-api ([#334](https://github.com/web3-storage/w3protocol/issues/334)) ([b773376](https://github.com/web3-storage/w3protocol/commit/b77337692d9e4580031c429c429d4055d6f6ebff))
* **capabilities:** implement access/authorize and ./update caps ([#387](https://github.com/web3-storage/w3protocol/issues/387)) ([4242ce0](https://github.com/web3-storage/w3protocol/commit/4242ce046b8e95c43dbf33a139bb98b682eeb198)), closes [#385](https://github.com/web3-storage/w3protocol/issues/385)
* embedded key resolution ([#312](https://github.com/web3-storage/w3protocol/issues/312)) ([4da91d5](https://github.com/web3-storage/w3protocol/commit/4da91d5f7f798d0d46c4df2aaf224610a8760d9e))
* update @ucanto/* to ~4.2.3 ([#405](https://github.com/web3-storage/w3protocol/issues/405)) ([50c0c80](https://github.com/web3-storage/w3protocol/commit/50c0c80789c26b777e854b7208b7391499d2ef18))
* update access-api ucanto proxy to not need a signer ([#390](https://github.com/web3-storage/w3protocol/issues/390)) ([71cbeb7](https://github.com/web3-storage/w3protocol/commit/71cbeb718d0a5132b97efa1173a5aaf9c75cbe80))


### Bug Fixes

* fix client cli service did resolve ([#292](https://github.com/web3-storage/w3protocol/issues/292)) ([6be9608](https://github.com/web3-storage/w3protocol/commit/6be9608a907665a8123938ef804bebfffc5c7232))

## [2.1.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v2.0.0...capabilities-v2.1.0) (2022-12-13)


### Features

* sync encode/decode delegations ([#276](https://github.com/web3-storage/w3protocol/issues/276)) ([ab981fb](https://github.com/web3-storage/w3protocol/commit/ab981fb6e33799153022c0f6d06c282917e7af7c))


### Bug Fixes

* make d1 spaces.metadata nullable and change to kysely ([#284](https://github.com/web3-storage/w3protocol/issues/284)) ([c8a9ce5](https://github.com/web3-storage/w3protocol/commit/c8a9ce544226b3c8456d45b15e29cec84894aeb8)), closes [#280](https://github.com/web3-storage/w3protocol/issues/280)

## [2.0.0](https://github.com/web3-storage/w3protocol/compare/capabilities-v1.0.0...capabilities-v2.0.0) (2022-12-07)


### ⚠ BREAKING CHANGES

* upgrade access-api @ucanto/* and @ipld/dag-ucan major versions ([#246](https://github.com/web3-storage/w3protocol/issues/246))
* upgrade to `@ucanto/{interface,principal}`@^4.0.0 ([#238](https://github.com/web3-storage/w3protocol/issues/238))
* follow up on the capabilities extract ([#239](https://github.com/web3-storage/w3protocol/issues/239))

### Features

* **access-client:** cli and recover ([#207](https://github.com/web3-storage/w3protocol/issues/207)) ([adb3a8d](https://github.com/web3-storage/w3protocol/commit/adb3a8d61d42b31f106e86b95faa3e442f5dc2c7))
* follow up on the capabilities extract ([#239](https://github.com/web3-storage/w3protocol/issues/239)) ([ef5e779](https://github.com/web3-storage/w3protocol/commit/ef5e77922b67155f0c3e5cb37c12e32f9a56cce1))
* Revert "feat!: upgrade to `@ucanto/{interface,principal}`@^4.0.0" ([#245](https://github.com/web3-storage/w3protocol/issues/245)) ([c182bbe](https://github.com/web3-storage/w3protocol/commit/c182bbe5e8c5a7d5c74b10cbf4b7a45b51e9b184))
* upgrade access-api @ucanto/* and @ipld/dag-ucan major versions ([#246](https://github.com/web3-storage/w3protocol/issues/246)) ([5e663d1](https://github.com/web3-storage/w3protocol/commit/5e663d12ccea7d21cc8e7c36869f144a08eaa1b0))
* upgrade to `@ucanto/{interface,principal}`@^4.0.0 ([#238](https://github.com/web3-storage/w3protocol/issues/238)) ([2f3bab8](https://github.com/web3-storage/w3protocol/commit/2f3bab8924fe7f34a5db64d2521730fc85739d3a))


### Bug Fixes

* fix Access API cannot get space/info [#243](https://github.com/web3-storage/w3protocol/issues/243) ([#255](https://github.com/web3-storage/w3protocol/issues/255)) ([1bacd54](https://github.com/web3-storage/w3protocol/commit/1bacd544da803c43cf85043ecdada4dee2b3e2d3))
* generated typdefs ([#258](https://github.com/web3-storage/w3protocol/issues/258)) ([2af1b76](https://github.com/web3-storage/w3protocol/commit/2af1b76057476d2510d98a0b99a95f820cf4d344))

## 1.0.0 (2022-12-01)


### Bug Fixes

* add exports to packages/capabilities/readme.md, add workflow to check for conventional-commits names in PRs ([#233](https://github.com/web3-storage/w3protocol/issues/233)) ([da63284](https://github.com/web3-storage/w3protocol/commit/da6328467a198e3197bf20219aa2fa3bbe047d65))
