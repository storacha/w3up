# stop using d1 with `@web3-storage/access-api`

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

* [`@web3-storage/access-api` data storage](https://hackmd.io/f5PiUFarQJiq6L0K7xaLQA)

### Reasons we need to stop using D1

1. storage limitations are a ticking time bomb in production
  * TODO link to limitations
2. Sentry (at least the way we know how to use it) is incompatible with D1
  * using Cloudflare D1 Public Alpha requires the `no_bundle=false` option 
    * TODO: link
  * the way that Sentry source maps work in `@web3-storage/website` and `@nftstorage/website` requires `no_bundle=true`
    * for sentry stack traces, there are two ways it could work:
      1. raw toucan-js, and when there is an error, it gets line info + stack trace info from V8 ans sends to sentry. This is ideal but only works if `no_bundle=true`
      2. dont rely on stack trace info from runtime V8. Instead, have our CI workflow push `worker.js` + `worker.js.map` to sentry's 'deployments API'.
3. D1 tooling for migrations isn't sufficient. Specifically, there is migration tooling, but it doesn't allow for alterating tables in migrations. D1 also doesn't support transactions, so we can't use them in migrations.

### More Context on Sentry + D1

* using Cloudflare D1 Public Alpha requires the `no_bundle=false` option TODO: link
  * this means you can't tell wrangler *not* to write a `dist/worker.js`
  * the reason you'd want to do that
    * for sentry stack traces, there are two ways it could work
      1. raw toucan-js, and when there is an error, it gets line info + stack trace info from V8 ans sends to sentry. This is ideal but only works if `no_bundle=true`
      2. dont rely on stack trace info from runtime V8. Instead, have our CI workflow push `worker.js` + `worker.js.map` to sentry's 'deployments API'.
* the way that sentry source maps work in `@web3-storage/website` and `@nftstorage/website` requires `no_bundle=true`, so that method is incompatible with Cloudflare D1 Public Alpha.
  * one benefit of removing cloudflare D1 is that then we can have source maps in sentry in the same way as our other cloudflare workers projects.
    

* robertcepa, the toucan-js developer, has offered advice to us before, and [his last recommendation on 2022-12-06](https://github.com/robertcepa/toucan-js/issues/54#issuecomment-1338937523) was to use `toucan-js@3.x`
  * this is different than what `@nftstorage/website` and `@web3-storage/website` use, which is `toucan-js@2.7.x`
  * @gobengo tried upgrading to toucan-js in access-api, but it didn't help on its own

## Options Considered

<!--
What are the different options we considered? What are their pros & cons?
-->

1. access-api should support `voucher/*` protocol even after removing D1
  * pros: users dont have to upgrade.
  * cons: costs money to find a way to to keep this working without d1
  * no one has advocated for this in conversations with @travis @alanshaw @vasco-santos @Gozala

2. run `access/*` and `provider/*` invocation handling in AWS + Lambda deployed by w3infra
  * how
    * continue developing the handling logic in w3up monorepo, which publishes npm packages
  * cons
    * this isn't strictly needed just to decommission D1
  * pros
    * consistent devops with access-api + w3infra (e.g. upload-api)
    * devs want this to happen: @vasco-santos @alanshaw @olizilla 
    * may lower costs to unify our architecture
    * definitely lowers development costs, unifying our dev tooling and standardizing operating procecedures

## Decision

<!--
What is the change that we're proposing and/or doing?
-->

### Architectural Decisions

* Author and unit test new ucanto invocation handlers in w3up monorepo, and export them from packages deployed to npm
* Always prefer deploying ucanto servers to AWS, deployed by w3infra, **unless* cloudflre's pricing model provides a unique benefit
  * these handlers will often depend on packages developed in w3up monorepo

### Project Plan

* [ ] remove implementaiton of voucher protocol in access-api (because it depends on D1)
* [ ] export `access-api` service factory from package in w3up monorepo (similar to [upload-api](https://github.com/web3-storage/w3up/tree/main/packages/upload-api))
  * create `@web3-storage/api-implementations` exporting `access-api` tooling

--
* [ ] w3infra has SST 'stack' that manages AWS Lambdas that serve `access/delegate` invocations
  * @vasco-santos could help due SST-specific things, e.g. creating a DynamoDB delegations
  * @travis could implement and use @vasco-santos/@olizilla as reviewers
* [ ] consider renaming `@web3-storage/api-implementations`
* [ ] when `access-api` is running in AWS lambda, consider renaming `@web3-storage/access-api` to `@web3-storage/access-api-OLD-OR-CLOUDFLARE`


## Consequences

<!--
What becomes easier or more challenging to do because of this change?
-->

* existing users of w3up tooling that rely on the `voucher/*` protocol will stop working alltogether
  * these users will need update their applications to make use of the new `access/*` protocols released in March 2023


## Links &amp; References

<!--
Link to other ADRs, GitHub issues, documentation, etc.
-->

