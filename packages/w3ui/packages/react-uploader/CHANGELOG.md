# Changelog

## [3.0.0](https://github.com/web3-storage/w3ui/compare/react-uploader-v2.1.2...react-uploader-v3.0.0) (2022-12-15)


### ⚠ BREAKING CHANGES

* core and framework components have changed considerably. Please read the updated doucmentation.

### Features

* consume access and upload client ([#159](https://github.com/web3-storage/w3ui/issues/159)) ([e36d842](https://github.com/web3-storage/w3ui/commit/e36d842b1695032355ab29646c3dce6a33880517))

## [2.1.2](https://github.com/web3-storage/w3ui/compare/react-uploader-v2.1.1...react-uploader-v2.1.2) (2022-10-27)


### Bug Fixes

* update dependencies ([e94f90d](https://github.com/web3-storage/w3ui/commit/e94f90d08e575f16ca4a91c6032bc3af6a613fcf))
* uploads listing ([#104](https://github.com/web3-storage/w3ui/issues/104)) ([dc2139f](https://github.com/web3-storage/w3ui/commit/dc2139f5e00c9195c480ce5c98a78b4296713ac7))

## [2.1.1](https://github.com/web3-storage/w3ui/compare/react-uploader-v2.1.0...react-uploader-v2.1.1) (2022-10-17)


### Bug Fixes

* remove wallet modules ([17ae732](https://github.com/web3-storage/w3ui/commit/17ae7326b08b0129a64de4235d795a808e750514))

## [2.1.0](https://github.com/web3-storage/w3ui/compare/react-uploader-v2.0.0...react-uploader-v2.1.0) (2022-10-17)


### Features

* use keyring modules ([083a9ce](https://github.com/web3-storage/w3ui/commit/083a9ce3c64b91cb3017308bdf71f046ec93bce0))

## [2.0.0](https://github.com/web3-storage/w3ui/compare/react-uploader-v1.1.0...react-uploader-v2.0.0) (2022-10-01)


### ⚠ BREAKING CHANGES

* The uploader-core API has been augmented with a new method to support chunked CAR uploads `uploadCarChunks`. The static `encode*` functions are now exported directly from the `*-uploader` modules instead of being injected by the provider and have different signatures to allow for streaming DAG generation. The `uploadCar` method of the provider has been replaced with the more friendly `uploadFile` and `uploadDirectory` functions (and `uploadCarChunks` to allow for direct CAR uploads).

### Features

* add CAR splitting ([#66](https://github.com/web3-storage/w3ui/issues/66)) ([1c57dba](https://github.com/web3-storage/w3ui/commit/1c57dba9ef51845927432acd3836d4c576eb39fe))

## [1.1.0](https://github.com/web3-storage/w3ui/compare/react-uploader-v1.0.1...react-uploader-v1.1.0) (2022-09-28)


### Features

* solid uploader component and example ([6412dbb](https://github.com/web3-storage/w3ui/commit/6412dbb10d2afd9ad49f2ca895f93a5bac2e834d))

## [1.0.1](https://github.com/web3-storage/w3ui/compare/react-uploader-v1.0.0...react-uploader-v1.0.1) (2022-09-22)


### Bug Fixes

* resolve call fetch on window object ([777df5d](https://github.com/web3-storage/w3ui/commit/777df5dbbd3aaa890a095c7eb39d74633505690e))

## 1.0.0 (2022-09-20)


### Features

* add global build ([b1034c1](https://github.com/web3-storage/w3ui/commit/b1034c1e05548cd2564532e4cb1e15c0d6e5ab92)), closes [#2](https://github.com/web3-storage/w3ui/issues/2)
* add README for packages ([6d1690b](https://github.com/web3-storage/w3ui/commit/6d1690b3ba557a95c4203f6f22fe5c6700626766)), closes [#26](https://github.com/web3-storage/w3ui/issues/26)
* multi file upload ([4f9a5ce](https://github.com/web3-storage/w3ui/commit/4f9a5ced2d3819dd5d3eb05c0a273230ff003de2))
* sign up/in example ([62fc04f](https://github.com/web3-storage/w3ui/commit/62fc04f05161a860ee65de0f1e3ad1665cf2b9b8))
* wip file-upload example ([0b48ffa](https://github.com/web3-storage/w3ui/commit/0b48ffad56acdedb8f787ef69a7e9b8c886c0631))


### Bug Fixes

* add license to published packages ([957178d](https://github.com/web3-storage/w3ui/commit/957178d72cb0051c2f798793a314acd23b8f3beb))
* entry points ([54c59af](https://github.com/web3-storage/w3ui/commit/54c59af3a654ec96b8587781be5c56a658ff41eb))
* file upload example ([796d607](https://github.com/web3-storage/w3ui/commit/796d6076bd0781c23ccaafd3d259830950f43959))
