import * as Link from 'multiformats/link'
import { filesize, uploadListResponseToString } from '../lib.js'

/**
 * @typedef {import('multiformats').LinkJSON} LinkJSON
 * @typedef {import('@storacha/client/types').CARLink} CARLink
 */

/** @type {import('entail').Suite} */
export const testFilesize = {
  filesize: (assert) => {
    /** @type {Array<[number, string]>} */
    const testdata = [
      [5, '5B'],
      [50, '0.1KB'],
      [500, '0.5KB'],
      [5_000, '5.0KB'],
      [50_000, '0.1MB'],
      [500_000, '0.5MB'],
      [5_000_000, '5.0MB'],
      [50_000_000, '0.1GB'],
      [500_000_000, '0.5GB'],
      [5_000_000_000, '5.0GB'],
    ]
    testdata.forEach(([size, str]) => assert.equal(filesize(size), str))
  },
}

/** @type {import('@storacha/client/types').UploadListSuccess} */
const uploadListResponse = {
  size: 2,
  cursor: 'bafybeibvbxjeodaa6hdqlgbwmv4qzdp3bxnwdoukay4dpl7aemkiwc2eje',
  results: [
    {
      root: Link.parse(
        'bafybeia7tr4dgyln7zeyyyzmkppkcts6azdssykuluwzmmswysieyadcbm'
      ),
      shards: [
        Link.parse(
          'bagbaierantza4rfjnhqksp2stcnd2tdjrn3f2kgi2wrvaxmayeuolryi66fq'
        ),
      ],
      updatedAt: new Date().toISOString(),
      insertedAt: new Date().toISOString(),
    },
    {
      root: Link.parse(
        'bafybeibvbxjeodaa6hdqlgbwmv4qzdp3bxnwdoukay4dpl7aemkiwc2eje'
      ),
      shards: [
        Link.parse(
          'bagbaieraxqbkzwvx5on6an4br5hagfgesdfc6adchy3hf5qt34pupfjd3rbq'
        ),
      ],
      updatedAt: new Date().toISOString(),
      insertedAt: new Date().toISOString(),
    },
  ],
  after: 'bafybeibvbxjeodaa6hdqlgbwmv4qzdp3bxnwdoukay4dpl7aemkiwc2eje',
  before: 'bafybeia7tr4dgyln7zeyyyzmkppkcts6azdssykuluwzmmswysieyadcbm',
}

/** @type {import('entail').Suite} */
export const testUpload = {
  'uploadListResponseToString can return the upload roots CIDs as strings': (
    assert
  ) => {
    assert.equal(
      uploadListResponseToString(uploadListResponse, {}),
      `bafybeia7tr4dgyln7zeyyyzmkppkcts6azdssykuluwzmmswysieyadcbm
bafybeibvbxjeodaa6hdqlgbwmv4qzdp3bxnwdoukay4dpl7aemkiwc2eje`
    )
  },

  'uploadListResponseToString can return the upload roots as newline delimited JSON':
    (assert) => {
      assert.equal(
        uploadListResponseToString(uploadListResponse, {
          shards: true,
          plainTree: true,
        }),
        `bafybeia7tr4dgyln7zeyyyzmkppkcts6azdssykuluwzmmswysieyadcbm
└─┬ shards
  └── bagbaierantza4rfjnhqksp2stcnd2tdjrn3f2kgi2wrvaxmayeuolryi66fq

bafybeibvbxjeodaa6hdqlgbwmv4qzdp3bxnwdoukay4dpl7aemkiwc2eje
└─┬ shards
  └── bagbaieraxqbkzwvx5on6an4br5hagfgesdfc6adchy3hf5qt34pupfjd3rbq
`
      )
    },

  'uploadListResponseToString can return the upload roots and shards as a tree':
    (assert) => {
      assert.equal(
        uploadListResponseToString(uploadListResponse, { json: true }),
        `{"root":{"/":"bafybeia7tr4dgyln7zeyyyzmkppkcts6azdssykuluwzmmswysieyadcbm"},"shards":[{"/":"bagbaierantza4rfjnhqksp2stcnd2tdjrn3f2kgi2wrvaxmayeuolryi66fq"}]}
{"root":{"/":"bafybeibvbxjeodaa6hdqlgbwmv4qzdp3bxnwdoukay4dpl7aemkiwc2eje"},"shards":[{"/":"bagbaieraxqbkzwvx5on6an4br5hagfgesdfc6adchy3hf5qt34pupfjd3rbq"}]}`
      )
    },
}
