# coin-payments

Library to assist in processing cryptocurrency payments.

## Getting Started

```bash
npm i @faast/coin-payments
```

```typescript
import { CoinPayments } from '@faast/coin-payments'

const coinPayments = new CoinPayments({
  seed: '5cf2d4a8b0...ca676651f'
})

// For read only, first use seed, then use the public config
const readOnlyConfig = coinPayments.getPublicConfig()
const readOnlyCoinPayments = new CoinPayments(readOnlyConfig)

// To process payments, select your asset
const xrpPayments = coinPayments.forAsset('XRP')
await xrpPayments.init()
```

Generate a deposit address.
This is useful if you are a hot wallet and don't store the private key. You will need
to keep track of which path node you are on (increasing `int`):

```js
let { address, extraId } = xrpPayments.getPayport(1234)
// Customer sends deposit to `address` with destination tag `extraId`
```

Validate an address:

```js
if (xrpPayments.isValidAddress(depositAddress)) {
  // do something
}
```

Get the balance of an address:

```js
let { confirmedBalance, unconfirmedBalance } = await xrpPayments.getBalance(1234)
```

Generate a sweep transaction for an address, then broadcast it:

```js
let unsignedTx = await xrpPayments.createSweepTransaction(1234, to)
let signedTx = await xrpPayments.signTransaction(unsignedTx)
let { id: txHash } = await xrpPayments.broadcastTransaction(signedtx)
```

Generate a simple send transaction

```js
let unsignedTx = await xrpPayments.createTransaction(1234, to, '1.234')
// Then sign and broadcast the transaction
```

Get a transaction and check if it is confirmed:

```js
let txInfo = await xrpPayments.getTransactionInfo(txHash)
if (txInfo.isConfirmed) {
  // txInfo.confirmations > 0
}
```

*See tests or types for more utilities*

## License

MIT
