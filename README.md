# coinlib monorepo

A nodejs library providing a unified API for sending and receiving crypto payments for multiple coin networks.

## Setting Up


0. Install required compiler tools
```bash
brew install autoconf automake libtool

```

1. Install root dependencies:
```bash
npm install
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
Add payment factory to `packages/coinlib/src/constants.ts`

#### Registering assets
Add payment config to `packages/coinlib/src/types.ts`

### Abstractions to implement
Find types and interfaces at `packages/coinlib-common/src/`

## Usage

```bash
npm i @bitaccess/coinlib
```

See [@bitaccess/coinlib README](./packages/coinlib/README.md) for usage.

## Packages

- [@bitaccess/coinlib](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib) - Wrapper for all coins
- [@bitaccess/coinlib-common](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-common) - Common interfaces
- [@bitaccess/coinlib-bitcoin](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-bitcoin) - BTC
- [@bitaccess/coinlib-ethereum](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-ethereum) - ETH & ERC20
- [@bitaccess/coinlib-litecoin](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-litecoin) - LTC
- [@bitaccess/coinlib-doge](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-doge) - DOGE
- [@bitaccess/coinlib-bitcoin-cash](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-bitcoin-cash) - BCH
- [@bitaccess/coinlib-tron](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-tron) - TRX
- [@bitaccess/coinlib-stellar](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-stellar) - XLM
- [@bitaccess/coinlib-ripple](https://github.com/bitaccess/coinlib/blob/master/packages/coinlib-ripple) - XRP

## Publishing new version

*Note*: Never use `npm version`, it doesn't work with monorepo

### Version types

- `patch` - fixes only, no feature or breaking changes
- `minor` - feature changes
- `major` - breaking changes

### Steps to publish

1. Run tests `npm run test`
2. Create version commit and publish to npm `lerna publish (patch|minor|major)`

or

2. Create a new version commit `lerna version (patch|minor|major)`
3. Publish to npm `lerna publish from-git`

