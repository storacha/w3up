# Changelog


## [5.0.1](https://github.com/web3-storage/w3ui/compare/vue-uploader-v5.0.0...vue-uploader-v5.0.1) (2023-09-06)


### Bug Fixes

* set minimum workspace dep versions to bump package numbers ([#554](https://github.com/web3-storage/w3ui/issues/554)) ([6f44a4e](https://github.com/web3-storage/w3ui/commit/6f44a4ebc9a05fc3f029a029787665c470208fd7))

## [5.0.0](https://github.com/web3-storage/w3ui/compare/vue-uploader-v4.2.0...vue-uploader-v5.0.0) (2023-07-25)


### ⚠ BREAKING CHANGES

* upgrade access client, ucanto and other packages ([#530](https://github.com/web3-storage/w3ui/issues/530))

### Features

* upgrade access client, ucanto and other packages ([#530](https://github.com/web3-storage/w3ui/issues/530)) ([8e7321b](https://github.com/web3-storage/w3ui/commit/8e7321be61bded29ac8b29c781dabf665865ec97))

## [4.2.0](https://github.com/web3-storage/w3ui/compare/vue-uploader-v4.1.0...vue-uploader-v4.2.0) (2023-06-20)


### Features

* implement `uploadCAR` in uploader ([#517](https://github.com/web3-storage/w3ui/issues/517)) ([40036ea](https://github.com/web3-storage/w3ui/commit/40036ea391fa47c26ab35fb29511d9b3a1305aaf))


### Bug Fixes

* inferred type error ([#516](https://github.com/web3-storage/w3ui/issues/516)) ([1bf4cf2](https://github.com/web3-storage/w3ui/commit/1bf4cf26efa846624864b661888b1178319ba11d))

## [4.1.0](https://github.com/web3-storage/w3ui/compare/vue-uploader-v4.0.0...vue-uploader-v4.1.0) (2023-05-09)


### Features

* upload progress ([#499](https://github.com/web3-storage/w3ui/issues/499)) ([6c9de97](https://github.com/web3-storage/w3ui/commit/6c9de9799ff25e16ed5b5ce4f1b66bd9430466f8))
* w3console cleanup and updates to packages to support it ([#507](https://github.com/web3-storage/w3ui/issues/507)) ([78aee2a](https://github.com/web3-storage/w3ui/commit/78aee2a63f3f56dedc493b0fe8e60aa94ad84f07))


### Bug Fixes

* tweak READMEs for packages that release-please didn't release right ([#440](https://github.com/web3-storage/w3ui/issues/440)) ([845a6b6](https://github.com/web3-storage/w3ui/commit/845a6b644dbec6bf65ff09e751da7b7f01c8cf1e))

## [4.0.0](https://github.com/web3-storage/w3ui/compare/vue-uploader-v3.0.1...vue-uploader-v4.0.0) (2023-03-23)


### ⚠ BREAKING CHANGES

* use new account model ([#400](https://github.com/web3-storage/w3ui/issues/400))

### Features

* use new account model ([#400](https://github.com/web3-storage/w3ui/issues/400)) ([66dd20b](https://github.com/web3-storage/w3ui/commit/66dd20b3a95fc496da1aeb40342c8f691d147c7e))

### Bug Fixes

* tweak READMEs for packages that release-please didn't release right ([#440](https://github.com/web3-storage/w3ui/issues/440)) ([845a6b6](https://github.com/web3-storage/w3ui/commit/845a6b644dbec6bf65ff09e751da7b7f01c8cf1e))

## [3.0.1](https://github.com/web3-storage/w3ui/compare/vue-uploader-v3.0.0...vue-uploader-v3.0.1) (2022-12-15)


### Bug Fixes

* update dependencies ([996871f](https://github.com/web3-storage/w3ui/commit/996871fc433659a56100e529a969fbb9c054e103))

## [3.0.0](https://github.com/web3-storage/w3ui/compare/vue-uploader-v2.1.2...vue-uploader-v3.0.0) (2022-12-15)


### ⚠ BREAKING CHANGES

* core and framework components have changed considerably. Please read the updated doucmentation.

### Features

* consume access and upload client ([#159](https://github.com/web3-storage/w3ui/issues/159)) ([e36d842](https://github.com/web3-storage/w3ui/commit/e36d842b1695032355ab29646c3dce6a33880517))

## [2.1.2](https://github.com/web3-storage/w3ui/compare/vue-uploader-v2.1.1...vue-uploader-v2.1.2) (2022-10-27)


### Bug Fixes

* update dependencies ([e94f90d](https://github.com/web3-storage/w3ui/commit/e94f90d08e575f16ca4a91c6032bc3af6a613fcf))
* uploads listing ([#104](https://github.com/web3-storage/w3ui/issues/104)) ([dc2139f](https://github.com/web3-storage/w3ui/commit/dc2139f5e00c9195c480ce5c98a78b4296713ac7))

## [2.1.1](https://github.com/web3-storage/w3ui/compare/vue-uploader-v2.1.0...vue-uploader-v2.1.1) (2022-10-17)


### Bug Fixes

* remove wallet modules ([17ae732](https://github.com/web3-storage/w3ui/commit/17ae7326b08b0129a64de4235d795a808e750514))

## [2.1.0](https://github.com/web3-storage/w3ui/compare/vue-uploader-v2.0.0...vue-uploader-v2.1.0) (2022-10-17)


### Features

* use keyring modules ([083a9ce](https://github.com/web3-storage/w3ui/commit/083a9ce3c64b91cb3017308bdf71f046ec93bce0))

## [2.0.0](https://github.com/web3-storage/w3ui/compare/vue-uploader-v1.0.1...vue-uploader-v2.0.0) (2022-10-01)


### ⚠ BREAKING CHANGES

* The uploader-core API has been augmented with a new method to support chunked CAR uploads `uploadCarChunks`. The static `encode*` functions are now exported directly from the `*-uploader` modules instead of being injected by the provider and have different signatures to allow for streaming DAG generation. The `uploadCar` method of the provider has been replaced with the more friendly `uploadFile` and `uploadDirectory` functions (and `uploadCarChunks` to allow for direct CAR uploads).

### Features

* add CAR splitting ([#66](https://github.com/web3-storage/w3ui/issues/66)) ([1c57dba](https://github.com/web3-storage/w3ui/commit/1c57dba9ef51845927432acd3836d4c576eb39fe))

## [1.0.1](https://github.com/web3-storage/w3ui/compare/vue-uploader-v1.0.0...vue-uploader-v1.0.1) (2022-09-28)


### Bug Fixes

* update dependency versions ([4c75a3f](https://github.com/web3-storage/w3ui/commit/4c75a3fc277f47fc7f9856df78e65b2284a02e80))

## 1.0.0 (2022-09-28)


### Features

* vue uploader component, example and docs ([779f777](https://github.com/web3-storage/w3ui/commit/779f7771cead66b251815e3e167badc037b85597))
