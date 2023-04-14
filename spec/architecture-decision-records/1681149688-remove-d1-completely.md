# stop using d1 with `@web3-storage/access-api` and instead use AWS

<!--
This is a minimal template. Feel free to add more sections as needed.

Please review also the Design Doc template and add any relevant sections to your ADR:
https://www.notion.so/pl-strflt/Writing-a-Design-Doc-aa6034be43c2434ba88a2fd844516e94
-->

> Status: PROPOSED

Authors
* @gobengo
* @travis

<!--
PROPOSED, ACCEPTED, REJECTED, DEPRECATED, SUPERSEDED BY {link-to-ADR}
-->

## Context

<!--
What is the issue that we're seeing that motivates this decision or change?
-->

### Prior Documents

* [`@web3-storage/access-api` data storage](https://hackmd.io/f5PiUFarQJiq6L0K7xaLQA) - contains [overview of access-api ucan invocation handlers](https://hackmd.io/f5PiUFarQJiq6L0K7xaLQA#access-api-invocation-handlers), [access-api data access objects interfaces and implementations that interact with D1 et al](https://hackmd.io/f5PiUFarQJiq6L0K7xaLQA#access-api-operations-that-interact-with-data-stores), [d1 database schema](https://hackmd.io/f5PiUFarQJiq6L0K7xaLQA#access-api-data-stores), [opportunities to use ucan log](https://hackmd.io/f5PiUFarQJiq6L0K7xaLQA#opportunities-to-use-ucan-stream).

### Reasons to Stop Using D1

1. D1 has [limits](https://developers.cloudflare.com/d1/platform/limits/) that are too low for us
   > * Databases: 10 per account
   > * Database Size: 100 MB
   > * Maximum Database Backups: 24hrs
   > 
   > &hellip;
   > Many of these limits will increase during D1’s public alpha.
   * Why this matters
        * most resources we store in D1 have at least one 32-byte CID
        * some also have a `did:key` or other did. [`did:key` tends to be at least 32 bytes](https://w3c-ccg.github.io/did-method-key/#signature-method-creation-algorithm)
        * upper bound on number of CIDs/`did:key` we can store 100MB / 32B = 3,125,000

2. Using D1 Alpha is incompatible with cloudflare's `wrangler tooling` with `no_bundle=true`.
    * This was very inconvenient for a long time, and made some debugging difficult because this limited our ability to use sentry in the same way we did for web3.storage website and nft.storage website.
      * as of 2023-04-14, it appears we found a [decent workaround in w3up#739](https://github.com/web3-storage/w3up/pull/739)

3. D1 tooling for migrations isn't very good yet
    * no 'down migrations'
    * no transactions - makes schema or data migrations riskier than needed
    * some of these may be fixed in [cloduflare's plans for the future on migrations](https://developers.cloudflare.com/d1/platform/migrations/#plans-for-the-future)

## Options Considered

<!--
What are the different options we considered? What are their pros & cons?
-->

1. run `access/*` and `provider/*` invocation handling in AWS + Lambda deployed by w3infra
    * how
      * continue developing the handling logic in w3up monorepo, which publishes npm packages
    * cons
      * this isn't strictly needed just to decommission D1
    * pros
      * consistent devops with access-api + w3infra (e.g. upload-api)
      * devs want this to happen: @vasco-santos @alanshaw @olizilla 
      * may lower costs to unify our architecture
      * definitely lowers development costs, unifying our dev tooling and standardizing operating procecedures

2. access-api should support `voucher/*` protocol even after removing D1
    * pros: users dont have to upgrade.
    * cons: costs money to find a way to to keep this working without d1
    * no one has advocated for this in conversations with @travis @alanshaw @vasco-santos @Gozala

## Decision

<!--
What is the change that we're proposing and/or doing?
-->

### Architectural Decisions

1. Author and unit test new ucanto invocation handlers in w3up monorepo, and export them from packages deployed to npm
    * see [`@web3-storage/upload-api`](https://github.com/web3-storage/w3up/tree/main/packages/upload-api) for inspiration

2. Deploy w3up ucan invocation handling to AWS, deployed by w3infra, **unless* cloudflre's pricing model provides a unique benefit
    * these handlers will often depend on packages developed in w3up monorepo, e.g. how w3infra's `@web3-storage/w3infra-upload-api` [depends on](https://github.com/web3-storage/w3infra/blob/8532785c2cb54607f09d1a795031c158bde766b7/upload-api/service.js#L19) w3up's `@web3-storage/upload-api`
    * a lot of the times we were using D1, we can instead use DynamoDB or an AWS SQL service like RDS or Redshift. [see how upload-api creates objects that r/w to DynamoDB](https://github.com/web3-storage/w3infra/blob/8532785c2cb54607f09d1a795031c158bde766b7/upload-api/functions/ucan-invocation-router.js#L96) and injects those when constructing upload-api ucanto service from `@web3-storage/upload-api` w3up package

3. Remove support in access-api for handling invocations like `voucher/*` that were used in the access implementation before the `access/authorize`, `access/confirm`, `access/claim` flow. They have low usage, can be end-of-lifed before long anyway, and its not worth the cost to maintain them or replace their usage of D1.

4. When invocations handled by access-api have been either removed (e.g. `voucher/*`) or equivalent handlers are deployed to AWS via w3infra, change the access-api service to proxy `access/*` et al handlers to w3infra [in the same way it proxies `store/*` and `upload/*` invocations](https://github.com/web3-storage/w3up/blob/main/packages/access-api/src/service/index.js#L35).
    * this will allow for testing the new invocation handlers running on AWS, but will be opaque to any existing clients, who can continue sending invocations to cloudflare, where they will be proxied and served by w3infra

### Open Questions

* Can aws-sdk DynamoDB run in cloudflare workers?

### Tasks

* [ ] @gobengo document how we can store access/delegate delegations inside invocations in s3

* [ ] prototype DynamoDB + ProvisionsStorage (DynamoDB provisioned via AWS Console)

* [ ] remove implementaiton of voucher protocol in access-api (because it depends on D1)
* [ ] export `access-api` service factory from package in w3up monorepo (similar to [upload-api](https://github.com/web3-storage/w3up/tree/main/packages/upload-api))
  * create `@web3-storage/access-service` exporting `access-api` service factory
* [ ] publish `@web3-storage/access-service` to npm (incl. github workflows release automation)

--

* [ ] w3infra: decide which SST 'stack' access-api ucan handlers should live in
  * @gobengo chatted with @vasco-santos briefly, and two options are:
    * add it to existing upload-api stack
    * create a new stack, e.g. 'access-api' or (@vasco-santos idea) 'api-gateway'
* [ ] w3infra has stack that deploys required AWS infra to serve access-api invocations:
  * API Gateway or ELB - accept HTTP traffic from internet
  * AWS Lambda - handles incoming HTTP requests, creates ucanto server, uses server to handle invocations and respond
  * DynamoDB - need database(s) that can replace d1 [delegations](https://github.com/web3-storage/w3up/blob/main/packages/access-api/src/utils/context.js#L80) and [provisions](https://github.com/web3-storage/w3up/blob/main/packages/access-api/src/utils/context.js#L91) - especially wherever we need consistency or close to it
  * other patterns may use kinesis, dynamodb streams, s3, etc. on a case-by-case basis, especially where eventual consistency is acceptable.
* [ ] w3infra has implementations of [`DelegationsStorage`](https://github.com/web3-storage/w3up/blob/main/packages/access-api/src/models/delegations.js#L67) backed by DynamoDB (and perhaps S3 for bytes)
* [ ] w3infra has implementations of [`ProvisionsStorage`](https://github.com/web3-storage/w3up/blob/main/packages/access-api/src/models/provisions.js#L54) backed by DynamoDB
* [ ] w3infra depends on `@web3-storage/access-service` (maintained in w3up repo and published to npm)

## Consequences

<!--
What becomes easier or more challenging to do because of this change?
-->

* existing users of w3up tooling that rely on the `voucher/*` protocol will stop working alltogether
  * these users will need update their applications to make use of the new `access/*` protocols released in March 2023
* More of w3up requests will be served by w3infra + AWS
  * AWS bill will go up
* Less or zero w3up requests will be served by cloudflare, and if they are, they may just be proxied to w3infra + AWS
  * Cloudflare Workers, D1, R2, etc. bill should go down

## Links &amp; References

<!--
Link to other ADRs, GitHub issues, documentation, etc.
-->

* [w3up access-api deployments -> w3infra](https://hackmd.io/lJJ0xzi0SHKZTjK5qgBt_w) - precursor to this
