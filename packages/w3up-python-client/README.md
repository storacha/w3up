# Storacha Uploader

A tool to create CAR files and upload content to Storacha decentralized storage.

## Install

```bash
# Requires Python 3.6+, Node.js and npm
pip install .
```

## Configure

Create a `.env` file with your credentials:
```
X_AUTH_SECRET_HEADER=your_auth_secret
AUTHORIZATION_HEADER=your_authorization
SPACE_DID=your_space_did
```

## Usage

```bash
storacha-uploader myfile.txt
```

This converts the file to CAR format, uploads it to Storacha, and provides an access link.


## Instructions to be used over the http bridge

Below instructions can be used over the http bridge by adding them to the list.json file.

```bash
{
  "tasks": [
    /*
    [
      "access/delegate",
      "did:key:z6Mkabc123",
      { "delegate": "<delegate_address>" }
    ],
    [
      "space/info",
      "did:key:z6Mkabc123"
    ],
    [
      "space/allocate",
      "did:key:z6Mkabc123",
      { "allocation": "<allocation_details>" }
    ],
    [
      "store/add",
      "did:key:z6Mkabc123",
      { "root": { "/": "<cid>" }, "shards": [] }
    ],
    [
      "store/get",
      "did:key:z6Mkabc123",
      { "root": { "/": "<cid>" } }
    ],
    [
      "store/remove",
      "did:key:z6Mkabc123",
      { "root": { "/": "<cid>" } }
    ],
    [
      "store/list",
      "did:key:z6Mkabc123"
    ],
    */
    [
      "upload/add",
      "did:key:z6Mkabc123",
      { "root": { "/": "<cid>" }, "shards": [] }
    ]
    /*
    ,
    [
      "upload/list",
      "did:key:z6Mkabc123",
      {}
    ],
    [
      "upload/remove",
      "did:key:z6Mkabc123",
      { "root": { "/": "<cid>" } }
    ],
    [
      "usage/report",
      "did:key:z6Mkabc123"
    ]
    */
  ]
}
```