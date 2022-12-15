# Changelog

## [3.0.0](https://github.com/web3-storage/w3ui/compare/solid-uploader-v2.1.2...solid-uploader-v3.0.0) (2022-12-15)


### ⚠ BREAKING CHANGES

* core and framework components have changed considerably. Please read the updated doucmentation.

### Features

* consume access and upload client ([#159](https://github.com/web3-storage/w3ui/issues/159)) ([e36d842](https://github.com/web3-storage/w3ui/commit/e36d842b1695032355ab29646c3dce6a33880517))

## [2.1.2](https://github.com/web3-storage/w3ui/compare/solid-uploader-v2.1.1...solid-uploader-v2.1.2) (2022-10-27)


### Bug Fixes

* update dependencies ([e94f90d](https://github.com/web3-storage/w3ui/commit/e94f90d08e575f16ca4a91c6032bc3af6a613fcf))
* uploads listing ([#104](https://github.com/web3-storage/w3ui/issues/104)) ([dc2139f](https://github.com/web3-storage/w3ui/commit/dc2139f5e00c9195c480ce5c98a78b4296713ac7))

## [2.1.1](https://github.com/web3-storage/w3ui/compare/solid-uploader-v2.1.0...solid-uploader-v2.1.1) (2022-10-17)


### Bug Fixes

* remove wallet modules ([17ae732](https://github.com/web3-storage/w3ui/commit/17ae7326b08b0129a64de4235d795a808e750514))

## [2.1.0](https://github.com/web3-storage/w3ui/compare/solid-uploader-v2.0.0...solid-uploader-v2.1.0) (2022-10-17)


### Features

* use keyring modules ([083a9ce](https://github.com/web3-storage/w3ui/commit/083a9ce3c64b91cb3017308bdf71f046ec93bce0))

## [2.0.0](https://github.com/web3-storage/w3ui/compare/solid-uploader-v1.0.1...solid-uploader-v2.0.0) (2022-10-01)


### ⚠ BREAKING CHANGES

* The uploader-core API has been augmented with a new method to support chunked CAR uploads `uploadCarChunks`. The static `encode*` functions are now exported directly from the `*-uploader` modules instead of being injected by the provider and have different signatures to allow for streaming DAG generation. The `uploadCar` method of the provider has been replaced with the more friendly `uploadFile` and `uploadDirectory` functions (and `uploadCarChunks` to allow for direct CAR uploads).

### Features

* add CAR splitting ([#66](https://github.com/web3-storage/w3ui/issues/66)) ([1c57dba](https://github.com/web3-storage/w3ui/commit/1c57dba9ef51845927432acd3836d4c576eb39fe))

## [1.0.1](https://github.com/web3-storage/w3ui/compare/solid-uploader-v1.0.0...solid-uploader-v1.0.1) (2022-09-28)


### Bug Fixes

* update dependency versions ([4c75a3f](https://github.com/web3-storage/w3ui/commit/4c75a3fc277f47fc7f9856df78e65b2284a02e80))

## 1.0.0 (2022-09-28)


### Features

* solid uploader component and example ([6412dbb](https://github.com/web3-storage/w3ui/commit/6412dbb10d2afd9ad49f2ca895f93a5bac2e834d))
