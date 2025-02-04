# How to use `tsconfig.json` files in this repo

Each TS package should contain a `tsconfig.json` file, plus a
`tsconfig.lib.json` (for a library) or `tsconfig.app.json` (for an app), and a
`tsconfig.spec.json` (assuming there are tests, which there should be). They
should look like the following:

```json
// tsconfig.json
{
  // This path may need to be adjusted for depth
  "extends": "../../tsconfig.base.json",
  "files": [], // Intentionally empty
  "compilerOptions": {
    // ... Any project-specific options, eg:
    // "module": "ES2022",
    // "moduleResolution": "node",
    // "jsx": "react-jsx"
  },
  "references": [
    {
      "path": "./tsconfig.lib.json" // or tsconfig.app.json
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ]
}

// tsconfig.lib.json or tsconfig.app.json
{
  "extends": "./tsconfig.json",
  "include": ["src"],
  "references": []
}

// tsconfig.spec.json
{
  "extends": "./tsconfig.json",
  "include": ["test"],
  "compilerOptions": {
    "rootDir": "."
  },
  "references": [
    {
      "path": "./tsconfig.lib.json"
    }
  ]
}
```

Then, run `nx sync`. Any needed inter-project references will be added for you.

For more information, see https://nx.dev/concepts/typescript-project-linking#set-up-typescript-project-references
