# coin-payments monorepo

A nodejs library providing a unified API for sending and receiving crypto payments for multiple coin networks.

## Setting Up

1. Install root dependencies:
```bash
npm install
```

2. Install dependencies for packages and link them together (done by [lerna](https://lerna.js))
```bash
npm run bs
```

3. Execute tests (done by [Jest](https://jestjs.io/))
```bash
npm run test
```

## Contribution guide

### Pull Request process
1. Ensure following branch naming conventions `<tag>/<subject_message>`;
2. Ensure following commit message conventions (templated);
3. Ensure test and linting are executed successfully;
4. You may merge the Pull Request in once you have the sign-off of other developers, or if you do not have permission to do that, you may request the reviewer to merge it for you;

### Commit message template
Run
```bash
git config commit.template  ./.gitmessage
```

### Adding new assets
#### Importing packages
Use lerna to import packages (More info in [lerna docs](https://github.com/lerna/lerna/))
#### Configuring assets
Add payment factory to `packages/coin-payments/src/constants.ts`

#### Registering assets
Add payment config to `packages/coin-payments/src/types.ts`

### Abstractions to implement
Find types and interfaces at `packages/payments-common/src/`

## Usage

```bash
npm i @faast/coin-payments
```

See [@faast/coin-payments README](./packages/coin-payments/README.md) for usage.

## Packages

- [@faast/coin-payments](./packages/coin-payments)
- [@faast/payments-common](./packages/payments-common)
- [@faast/tron-payments](./packages/tron-payments)
- [@faast/stellar-payments](./packages/stellar-payments)
- [@faast/ripple-payments](./packages/ripple-payments)
- [@faast/litecoin-payments](./packages/litecoin-payments)
- [@faast/ethereum-payments](./packages/ethereum-payments)
- [@faast/bitcoin-cash-payments](./packages/bitcoin-cash-payments)
- [@faast/dash-payments](./packages/dash-payments)

## Publishing new version

*Note*: Never use `npm version`, it doesn't work with monorepo

### Version types

- `patch` - fixes only, no feature or breaking changes
- `minor` - feature changes
- `major` - breaking changes

### Steps to publish

1. Run tests `npm run test`
2. Boostrap packages `npm run bs`
3. Create version commit and publish to npm `lerna publish (patch|minor|major)`

or

3. Create a new version commit `lerna version (patch|minor|major)`
4. Publish to npm `lerna publish from-git`

