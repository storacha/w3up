# Awake

## TODO

- [ ] concurrent sessions
- [ ] ucan store class
- [ ] validate ucan https://github.com/ucan-wg/awake#331-validation-ucan in awake/res
- [ ] timeout on messages sent
- [ ] rotate chain keys - Double Ratchet
- [ ] error over channel and disconnect during bad handshake
- [ ] update according to latest spec

## Notes

- HKDF: HMAC-based Extract-and-Expand Key Derivation Function
- KDF: Key Derivation Function
- OKM: Output Key Material
- Double Ratchet Algorithm: https://signal.org/docs/specifications/doubleratchet/

### Session setup

The Requestor SHOULD accept multiple concurrent connection attempts on this request DID, at least until the handshake is complete.
