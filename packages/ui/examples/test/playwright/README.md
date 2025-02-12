# Storacha Playwright tests

_Test our examples across all UI libraties we support, in real browsers!_

## Getting started

Install the deps and the browsers from the root of the monorepo

```bash
# update deps
$ pnpm install

# fetch test browsers
$ nx run @storacha/ui-example-test-playwright:prepare-environment
```

Run the tests

```bash
$ nx run @storacha/ui-example-test-playwright:test

examples/test/playwright test$ playwright test
[30 lines collapsed]
│ [30/33] [webkit] › sign-up-in.spec.ts:4:3 › vue: sign in
│ [31/33] [webkit] › uploads-list.spec.ts:4:3 › react: uploads list
│ [32/33] [webkit] › uploads-list.spec.ts:4:3 › solid: uploads list
│ [33/33] [webkit] › uploads-list.spec.ts:4:3 › vue: uploads list
│
│   33 passed (7s)
│ To open last HTML report run:
│
│   npx playwright show-report
│
└─ Done in 7.6s
```

## Debugging

You can run the test server manually to see what requests are made, and the tests will re-use your running server on http://localhost:1337 - it's powered by `serve` a static webserver running over the examples dir, configured in `examples/serve.json`

```bash
$ nx run @storacha/ui-example-test-playwright:serve
```

You can also watch the tests run in the browser to aid debugging

```bash
$ nx run @storacha/ui-example-test-playwright:test-debug
```
