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
X-AUTH-SECRET-HEADER=your_auth_secret
AUTHORIZATION-HEADER=your_authorization
SPACE_DID=your_space_did
```

## Usage

```bash
storacha-uploader myfile.txt
```

This converts the file to CAR format, uploads it to Storacha, and provides an access link.
