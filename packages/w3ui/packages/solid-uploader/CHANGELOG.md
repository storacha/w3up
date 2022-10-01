# Changelog

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
