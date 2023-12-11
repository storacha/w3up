<h1 align="center">
  <a href="https://beta.ui.web3.storage"><img width="250" src="https://bafybeianokbu4dgpfd2mq3za3wejtpscsy25ad6vocmmtxskcq6zig4cuq.ipfs.w3s.link/w3ui-logo-stroke.png" alt="Web3.Storage UI logo" /></a>
</h1>


<h3 align="center">Headless, type-safe, UI components for the next generation Web3.Storage APIs.</h3>

<p align="center">
  <a href="https://github.com/web3-storage/w3ui/actions/workflows/test.yaml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/w3ui/test.yaml?branch=main&style=for-the-badge" /></a>
  <a href="https://discord.com/channels/806902334369824788/864892166470893588"><img src="https://img.shields.io/badge/chat-discord?style=for-the-badge&logo=discord&label=discord&logoColor=ffffff&color=7389D8" /></a>
  <a href="https://github.com/web3-storage/w3ui/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

This repo contains reusauble UI modules for the web3.storage w3up service in React and vanilla JavaScript, and a set of example apps to see them dance.

## Documentation

The documentation at [beta.ui.web3.storage](https://beta.ui.web3.storage) is currently out of date - updates coming soon!

### API

[API Reference](https://github.com/web3-storage/w3ui/blob/main/docs/README.md)

### Examples

* **Sign up / Sign in** [React](https://github.com/web3-storage/w3ui/tree/main/examples/react/sign-up-in) | [Solid](https://github.com/web3-storage/w3ui/tree/main/examples/solid/sign-up-in) | [Vue](https://github.com/web3-storage/w3ui/tree/main/examples/vue/sign-up-in) | [Vanilla](https://github.com/web3-storage/w3ui/tree/main/examples/vanilla/sign-up-in)

    Demonstrates email authentication flow for the service, including private key creation and email validation.

* **Single File Upload** [React](https://github.com/web3-storage/w3ui/tree/main/examples/react/file-upload) | [Solid](https://github.com/web3-storage/w3ui/tree/main/examples/solid/file-upload) | [Vue](https://github.com/web3-storage/w3ui/tree/main/examples/vue/file-upload) | [Vanilla](https://github.com/web3-storage/w3ui/tree/main/examples/vanilla/file-upload)

    The simplest file upload using a file input. Includes the auth flow from "Sign up / Sign in".

* **Multiple File Upload** [React](https://github.com/web3-storage/w3ui/tree/main/examples/react/multi-file-upload) | [Solid](https://github.com/web3-storage/w3ui/tree/main/examples/solid/multi-file-upload) | [Vanilla](https://github.com/web3-storage/w3ui/tree/main/examples/vanilla/multi-file-upload)

    Slightly more complicated file and directory upload. Includes the auth flow from "Sign up / Sign in".

* **Uploads List** [React](https://github.com/web3-storage/w3ui/tree/main/examples/react/uploads-list) | [Solid](https://github.com/web3-storage/w3ui/tree/main/examples/solid/uploads-list) | [Vue](https://github.com/web3-storage/w3ui/tree/main/examples/vue/uploads-list) | [Vanilla](https://github.com/web3-storage/w3ui/tree/main/examples/vanilla/uploads-list)

    A demo of the list of uploads that have been made to an account.

## Contributing

Feel free to join in. All welcome. Please read our [contributing guidelines](https://github.com/web3-storage/w3ui/blob/main/CONTRIBUTING.md) and/or [open an issue](https://github.com/web3-storage/w3ui/issues)!

### Getting started

To contribute to this project, clone the w3ui repository and enter the `w3ui` directory

  ```sh
  git clone https://github.com/web3-storage/w3ui
  cd w3ui
  ```

Install dependencies and build:

  ```sh
  pnpm install
  ```

Then pick an example app from the list, `cd` into it's directory and run `pnpm start` to try it out.

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3ui/blob/main/LICENSE.md)
