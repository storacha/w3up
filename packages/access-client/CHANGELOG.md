# Changelog

## [6.0.0](https://github.com/web3-storage/w3protocol/compare/access-v5.0.2...access-v6.0.0) (2022-11-22)


### ⚠ BREAKING CHANGES

* **access-client:** bump to major
* store/list and upload/list types now require nb object with optional properties

### Features

* [#153](https://github.com/web3-storage/w3protocol/issues/153) ([#177](https://github.com/web3-storage/w3protocol/issues/177)) ([d6d448c](https://github.com/web3-storage/w3protocol/commit/d6d448c16f188398c30f2d1b83f69e1d7becd450))
* **access-client:** bump to major ([4d5899f](https://github.com/web3-storage/w3protocol/commit/4d5899f7ad7e7b4901dcc773d7348d3d09c4dca9))
* account recover with email ([#149](https://github.com/web3-storage/w3protocol/issues/149)) ([6c659ba](https://github.com/web3-storage/w3protocol/commit/6c659ba68d23c3448d5150bc76f1ddcb91ae18d8))
* add support for list pagination in list capability invocations ([#184](https://github.com/web3-storage/w3protocol/issues/184)) ([ced23db](https://github.com/web3-storage/w3protocol/commit/ced23db27f3b2a6122d4d0a684264f64b26ac95f))

## [5.0.2](https://github.com/web3-storage/w3protocol/compare/access-v5.0.1...access-v5.0.2) (2022-11-16)


### Bug Fixes

* workaround for ts bug in upload capabilities ([#171](https://github.com/web3-storage/w3protocol/issues/171)) ([b8d05b2](https://github.com/web3-storage/w3protocol/commit/b8d05b2ebabafa3081378bbc186fc766dde256c3))

## [5.0.1](https://github.com/web3-storage/w3protocol/compare/access-v5.0.0...access-v5.0.1) (2022-11-16)


### Bug Fixes

* workaround ts bug & generate valid typedefs ([#169](https://github.com/web3-storage/w3protocol/issues/169)) ([0b02d14](https://github.com/web3-storage/w3protocol/commit/0b02d14cc5b51ac0a0b8c879a917430ce0617dc7))

## [5.0.0](https://github.com/web3-storage/w3protocol/compare/access-v4.0.2...access-v5.0.0) (2022-11-15)


### ⚠ BREAKING CHANGES

* doc capabilities & make requierd nb non-optionals (#159)

### Features

* doc capabilities & make requierd nb non-optionals ([#159](https://github.com/web3-storage/w3protocol/issues/159)) ([6496773](https://github.com/web3-storage/w3protocol/commit/6496773f2a4977e06126ade37ae9dfc218b05f7f))

## [4.0.2](https://github.com/web3-storage/w3-protocol/compare/access-v4.0.1...access-v4.0.2) (2022-11-04)


### Bug Fixes

* upload/add capability root validation ([#136](https://github.com/web3-storage/w3-protocol/issues/136)) ([aae5b66](https://github.com/web3-storage/w3-protocol/commit/aae5b66112e6783054302b1f718f4c351aa80f3f))

## [4.0.1](https://github.com/web3-storage/w3-protocol/compare/access-v4.0.0...access-v4.0.1) (2022-11-04)


### Bug Fixes

* make multiformats 9 go away ([#133](https://github.com/web3-storage/w3-protocol/issues/133)) ([2668880](https://github.com/web3-storage/w3-protocol/commit/2668880a23c28ee45596fb1bc978564908a17e18))

## [4.0.0](https://github.com/web3-storage/w3-protocol/compare/access-v3.1.2...access-v4.0.0) (2022-11-01)


### ⚠ BREAKING CHANGES

* Remove 0.8 caps and add account delegation to the service (#123)

### Features

* add cancel create account ([#132](https://github.com/web3-storage/w3-protocol/issues/132)) ([feec113](https://github.com/web3-storage/w3-protocol/commit/feec113f04bd3b5c2eb570ba88e8c14274f91ed6))
* Remove 0.8 caps and add account delegation to the service ([#123](https://github.com/web3-storage/w3-protocol/issues/123)) ([878f8c9](https://github.com/web3-storage/w3-protocol/commit/878f8c9a38f02dac509ef0b4437ab3d1b8467eb3)), closes [#117](https://github.com/web3-storage/w3-protocol/issues/117) [#121](https://github.com/web3-storage/w3-protocol/issues/121)


### Bug Fixes

* throw error or return value ([#131](https://github.com/web3-storage/w3-protocol/issues/131)) ([cddf7b9](https://github.com/web3-storage/w3-protocol/commit/cddf7b9884d5f7c83f734e1c9d8543a1fc0a80ad))

## [3.1.2](https://github.com/web3-storage/w3-protocol/compare/access-v3.1.1...access-v3.1.2) (2022-10-27)


### Bug Fixes

* publish all dist ts files ([#127](https://github.com/web3-storage/w3-protocol/issues/127)) ([f705073](https://github.com/web3-storage/w3-protocol/commit/f70507305080c08665f51f7b75bd388048be86f7))

## [3.1.1](https://github.com/web3-storage/w3-protocol/compare/access-v3.1.0...access-v3.1.1) (2022-10-27)


### Bug Fixes

* export stores ([#125](https://github.com/web3-storage/w3-protocol/issues/125)) ([d3fa14d](https://github.com/web3-storage/w3-protocol/commit/d3fa14d6fe72c6b306b4a5b05276fbf137ab28f0))

## [3.1.0](https://github.com/web3-storage/w3-protocol/compare/access-v3.0.0...access-v3.1.0) (2022-10-26)


### Features

* add IndexedDB Store implementation ([#120](https://github.com/web3-storage/w3-protocol/issues/120)) ([9d73a26](https://github.com/web3-storage/w3-protocol/commit/9d73a26f7ab81f5baf9e7486ab99c1404a3dfff4))

## [3.0.0](https://github.com/web3-storage/w3-protocol/compare/access-v2.1.1...access-v3.0.0) (2022-10-24)


### ⚠ BREAKING CHANGES

* bump to 0.9 (#116)

### Features

* bump to 0.9 ([#116](https://github.com/web3-storage/w3-protocol/issues/116)) ([3e0b63f](https://github.com/web3-storage/w3-protocol/commit/3e0b63f38aace3a86655a1aa40e529c1501dc136))
* use modules and setup ([#99](https://github.com/web3-storage/w3-protocol/issues/99)) ([b060c0b](https://github.com/web3-storage/w3-protocol/commit/b060c0b299ee55dbe7820231c63be90129a39652)), closes [#98](https://github.com/web3-storage/w3-protocol/issues/98)


### Bug Fixes

* 0.9 ([#78](https://github.com/web3-storage/w3-protocol/issues/78)) ([1b1ed01](https://github.com/web3-storage/w3-protocol/commit/1b1ed01d537e88bbdeb5ea2aeb967b27bd11f87d))

## [2.1.1](https://github.com/web3-storage/w3-protocol/compare/access-v2.1.0...access-v2.1.1) (2022-10-10)


### Bug Fixes

* regression from `store -> all` name change ([#90](https://github.com/web3-storage/w3-protocol/issues/90)) ([14a6a5b](https://github.com/web3-storage/w3-protocol/commit/14a6a5b72deca8391420aa0c2dba9eac2d912ef2))

## [2.1.0](https://github.com/web3-storage/w3-protocol/compare/access-v2.0.0...access-v2.1.0) (2022-10-04)


### Features

* implement store/add size constraint ([#89](https://github.com/web3-storage/w3-protocol/issues/89)) ([efd8a2f](https://github.com/web3-storage/w3-protocol/commit/efd8a2faa0348ba9d467ca0c306ddec95aa6d05f))
* upload/* capabilities ([#81](https://github.com/web3-storage/w3-protocol/issues/81)) ([6c0e24f](https://github.com/web3-storage/w3-protocol/commit/6c0e24f50e08ece893666be2a5b46237df5cc83f))

## [2.0.0](https://github.com/web3-storage/w3-protocol/compare/access-v1.0.0...access-v2.0.0) (2022-09-30)


### ⚠ BREAKING CHANGES

* new accounts (#72)

### Features

* new accounts ([#72](https://github.com/web3-storage/w3-protocol/issues/72)) ([9f6cb41](https://github.com/web3-storage/w3-protocol/commit/9f6cb419d33b9446dd80f8541228096cf2677d45))

## [1.0.0](https://github.com/web3-storage/ucan-protocol/compare/access-v0.2.0...access-v1.0.0) (2022-09-21)


### ⚠ BREAKING CHANGES

* awake (#66)

### Features

* awake ([#66](https://github.com/web3-storage/ucan-protocol/issues/66)) ([bb66f57](https://github.com/web3-storage/ucan-protocol/commit/bb66f5772049e3363a753ea5b336c2fa1e42911e))

## [0.2.0](https://github.com/web3-storage/ucan-protocol/compare/access-v0.1.1...access-v0.2.0) (2022-09-16)


### Features

* abortable pullRegisterDelegation ([#56](https://github.com/web3-storage/ucan-protocol/issues/56)) ([adc0568](https://github.com/web3-storage/ucan-protocol/commit/adc0568e9f521d978b9886f483c42e61d27515b6))
* **access-api:** new email template ([cc19320](https://github.com/web3-storage/ucan-protocol/commit/cc193202e385d8079144aa90e989af07cf743b0b))
* fail validate for register email and add metrics ([0916ba6](https://github.com/web3-storage/ucan-protocol/commit/0916ba6bda8ad46ccc4f6bb0c6f4a48dd99db0c8))
* update deps ([d276375](https://github.com/web3-storage/ucan-protocol/commit/d2763750159ad56132f0b002ff5f50cc36fce20c))


### Bug Fixes

* add analytics to staging and prod ([14941d9](https://github.com/web3-storage/ucan-protocol/commit/14941d901e48e92896cc962b3e93488731afa381))
* new email for notifications ([57b6845](https://github.com/web3-storage/ucan-protocol/commit/57b6845a56f534505eeabdf5ab2e20f8b37c9532))
* temporary patch to allow fetch usage in browser ([#57](https://github.com/web3-storage/ucan-protocol/issues/57)) ([beff06e](https://github.com/web3-storage/ucan-protocol/commit/beff06ea5f4b0adb08f6fce59422373d818c3b9e))

## [0.1.1](https://github.com/web3-storage/ucan-protocol/compare/access-v0.1.0...access-v0.1.1) (2022-08-25)


### Bug Fixes

* proper envs and update deps ([d5dccb6](https://github.com/web3-storage/ucan-protocol/commit/d5dccb6e9c23b5ddbdffa4c67c04d195524b38f2))

## [0.1.0](https://github.com/web3-storage/ucan-protocol/compare/access-v0.0.1...access-v0.1.0) (2022-08-24)


### Features

* resync ([5cae9cd](https://github.com/web3-storage/ucan-protocol/commit/5cae9cd55cfcc06046eb23a2f33931299dd07ff5))
* sdk ([305b2d3](https://github.com/web3-storage/ucan-protocol/commit/305b2d317ba4b8743a1594e9dbe0d22bac90c229))
* sdk and cli ([2373447](https://github.com/web3-storage/ucan-protocol/commit/2373447db93ee16276f45fbfe40e4b98c28b6ab7))


### Bug Fixes

* **access:** export cap types ([ae70810](https://github.com/web3-storage/ucan-protocol/commit/ae7081015422abf88e8dbf0bedede805d6b05297))
