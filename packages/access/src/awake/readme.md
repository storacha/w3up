# Awake

## TODO

- [ ] ecdh public key compression
- [ ] concurrent sessions
- [ ] ucan store class
- [ ] dag-ucan DID does not support multicode 0x1200 p256 ecdh
- [ ] validate ucan https://github.com/ucan-wg/awake#331-validation-ucan in awake/res
- [ ] timeout on messages sent
- [ ] why does awake/res step send aud did ?

## Notes

- HKDF: HMAC-based Extract-and-Expand Key Derivation Function
- KDF: key derivation function

### Session setup

The Requestor SHOULD accept multiple concurrent connection attempts on this request DID, at least until the handshake is complete.
