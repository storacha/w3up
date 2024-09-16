# ⁂ `@web3-storage/capabilities`

[Capabilities](https://en.wikipedia.org/wiki/Capability-based_security) for interacting with [web3.storage](https://web3.storage)

## About

The w3up platform by [web3.storage](https://web3.storage) is implemented as a set of capabilities that can be invoked using the [ucanto](https://github.com/storacha/ucanto) RPC framework.

The `@web3-storage/capabilities` package contains capability definitions, which are used by clients to create invocations and by services to validate and parse invocations and route requests to the correct capability handler.

See the [capabilities spec](https://github.com/storacha/w3up/tree/main/spec/capabilities.md) for more information about each capability included in this package.

## Install

Install the package:

```bash
npm install @web3-storage/capabilities
```

## Usage

```js
import * as Space from '@web3-storage/capabilities/space'
import * as Store from '@web3-storage/capabilities/store'
import * as Top from '@web3-storage/capabilities/top'
import * as Types from '@web3-storage/capabilities/types'
import * as Upload from '@web3-storage/capabilities/upload'
import * as Utils from '@web3-storage/capabilities/utils'
import * as Plan from '@web3-storage/capabilities/plan'
import * as Filecoin from '@web3-storage/capabilities/filecoin'
import * as Aggregator from '@web3-storage/capabilities/filecoin/aggregator'
import * as DealTracker from '@web3-storage/capabilities/filecoin/deal-tracker'
import * as Dealer from '@web3-storage/capabilities/filecoin/dealer'
import * as Index from '@web3-storage/capabilities/index'

// This package has a "main" entrypoint but we recommend the usage of the specific imports above
```

### Capability types

The capability objects exported by this package are defined using ucanto's type-inference based capability parser. This results in concrete types that capture the details of each capability, allowing type-safe invocation and validation. 

When inspecting the concrete types of a capability object (e.g. in your IDE), you may see something similar to the following:


```ts
const add: TheCapabilityParser<DerivedMatch<{
    can: "store/add";
    with: URI<"did:">;
    nb: InferCaveats<{
        link: typeof Store.Schema.Link;
        size: Store.Schema.NumberSchema<number & Phantom<{
            typeof: "integer";
        }>, unknown>;
        origin: Store.Schema.Schema<...>;
    }>;
}, CapabilityMatch<...> | DerivedMatch<...>>>
```

While this is a fairly complex type signature, most of the types exist to support the mechanics of the capability parser and can generally be ignored when using the capabilities. The most interesting part as a user is the definition in the `DerivedMatch` type constraint, which shows the inferred ability and the constraints upon the resource URI and the caveats. In the example above, the `can` field shows that this capability's ability is `"store/add"`, its resource URI (the `with` field) must have the `"did:"` scheme, and there are three caveats defined in the `nb` field: `link`, `size`, and `origin`, each of which have constraints on their allowed values.

### Using the exported capabilities

The capability object exposes three methods via the `TheCapabilityParser` interface: `create`, `invoke`, and `delegate`. 

#### `create`

The `create` method returns a "materialized" capability object, which is to say, a JS object containing the `can`, `with`, and `nb` fields needed to fully specify a UCAN capability.

You must provide an input object containing a `with` resource URI that matches the constraints in the capability definition, as well as an `nb` object containing any caveats you want to include. If a capability has no caveats defined, or if all the caveats are optional, you may omit the `nb` field from the input.

```ts
const cap = Store.add.create({
  with: 'did:key:z6MkwFPNubhwM66HNKeJYtBu1Rv9n1LZdJhbyhLFg97Qr6FG',
  nb: {
    link: 'bagbaieraspawtgooy5lptr7loyd3fxjsrgkamre3y6au3ga4df5bkhrxdkmq',
    size: 20,
  }
})
```

The above would result in an object similar to the following:

```js
{
  can: 'store/add',
  with: 'did:key:z6MkwFPNubhwM66HNKeJYtBu1Rv9n1LZdJhbyhLFg97Qr6FG',
  nb: {
    link: 'bagbaieraspawtgooy5lptr7loyd3fxjsrgkamre3y6au3ga4df5bkhrxdkmq',
    size: 20,
  }
}
```

#### `invoke`

The `invoke` method returns an [invocation](https://github.com/ucan-wg/spec/#29-invocation) of the capability, which can be executed against a ucanto service.

Like `create`, `invoke` accepts `with` and `nb` fields, and the inputs must match the constraints in the capability definition.

Because invocations are a type of UCAN, you also need to supply some UCAN-related options. At minimum, you need to include the `issuer`, which is a `Signer` capable of signing a UCAN, and `audience`, which identifies the recipient by DID. You can also include any of the optional fields in the interface definition below:

```ts
interface UCANOptions {
  audience: Principal
  lifetimeInSeconds?: number
  expiration?: UCAN.UTCUnixTimestamp
  notBefore?: UCAN.UTCUnixTimestamp

  nonce?: UCAN.Nonce

  facts?: Fact[]
  proofs?: Proof[]
}
```

In the example below, we're generating a new `Signer` to act as the issuer of the invocation using the `@ucanto/principal/ed25519` package. Note that in a real application, the service would likely reject an invocation from this signer, as it does not have any delegated permissions. See the [access client package](https://github.com/storacha/w3up/tree/main/packages/access-client) for more about key management and delegation in practice.

```ts
import * as DID from '@ipld/dag-ucan/did'
import * as ed25519 from '@ucanto/principal/ed25519'

const issuer = await ed25519.generate()
const audience = DID.parse('did:web:web3.storage')

const invocation = Store.add.invoke({
  issuer,
  audience,
  with: 'did:key:z6MkwFPNubhwM66HNKeJYtBu1Rv9n1LZdJhbyhLFg97Qr6FG',
  nb: {
    link: 'bagbaieraspawtgooy5lptr7loyd3fxjsrgkamre3y6au3ga4df5bkhrxdkmq',
    size: 20,
  }
})
```

Note that creating an invocation does not automatically execute it. To send the invocation to a service, you need a ucanto `ConnectionView` configured to access the service, which you can pass into the `execute` method on the invocation object.

```ts
const result = await invocation.execute(serviceConnection)
```

#### `delegate`

The `delegate` method allows you to create a ucanto `Delegation`, which allows another principal to invoke the capability.

`delegate` accepts the same input as `invoke`, however the `nb` field is optional. If `nb` is present, the values provided will act as constraints on the invocations that can be made using the delegation. For example, creating a `store/add` delegation with the `size` caveat set to `1048576` would limit invocations made using the delegation to uploads of no more than 1MiB.

```ts
import * as DID from '@ipld/dag-ucan/did'
import * as ed25519 from '@ucanto/principal/ed25519'

const issuer = await ed25519.generate()
const audience = DID.parse('did:web:web3.storage')

const delegation = await Store.add.delegate({
  issuer,
  audience,
  with: 'did:key:z6MkwFPNubhwM66HNKeJYtBu1Rv9n1LZdJhbyhLFg97Qr6FG',
})
```

