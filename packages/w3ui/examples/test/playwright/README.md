# W3UI Playwright tests

_Test our examples across all UI libraties we support, in real browsers!_

## Getting started

Install the deps and the browsers from the root of the monorepo

```bash
# update deps
$ pnpm i

# fetch test browsers
$ pnpm playwright:install
```

Build the examples to their many dist folders

```bash
$ pnpm build:examples
```

Run the tests

```bash
$ pnpm test:examples

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
$ pnpm serve:examples
```

You can also run the tests locally from this project, and have it show you the browser as the tests run to aid debugging

```bash
$ cd examples/test/playwright
$ pnpm test

# or to see what's going on in the browser as the test runs
$ pnpm test:debug
```


