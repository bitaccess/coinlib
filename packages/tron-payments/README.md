# tron-payments

Library to assist in payment processing on tron. It first allows for generation
of address according to the [BIP44 standard](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki).

[Bitcore](https://bitcore.io/) is used for  deterministic public and private keys.
Please see the BIP32 standard for more information ([BIP32](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)).

Some work is inspired off of the prior work done by [tron-bip44](https://github.com/trapp/tron-bip44)

Coming soon: tools to sign transactions passed down from the server connected to web3.

## Getting Started

```bash
npm install --save go-faast/tron-payments
```

Create a new wallet (DON'T DO THIS ON PRODUCTION):

```js
let { HdTronPayments } = require('@faast/tron-payments')
let keys = HdTronPayments.generateNewKeys()
console.log(keys.xpub)
console.log(keys.xprv)
```

Generate an tron deposit address from a public seed (xpub).
This is useful if you are a hot wallet and don't store the private key. You will need
to keep track of which path node you are on (increasing INT):

```js
let tronPayments = new HdTronPayments({ hdKey: keys.xprv }) // xpub or xprv can be used
// for path m/44'/195'/0'/0/1234
let depositAddress = tronPayments.getAddress(1234)
let privateKey = tronPayments.getPrivateKey(1234) // will throw Error if xpub was provided as hdKey
```

or, if you'd rather not us bip44 and have existing private keys or addresses:

```js
let { KeyPairTronPayments } = require('@faast/tron-payments')
let tronPayments = new KeyPairTronPayments({ keyPairs: [privateKey0, address1, privateKey2] })
let depositAddress = await tronPayments.getAddress(1234) // address for privateKey2
await tronpayments.getPrivateKey(1234) // will throw error because keyPair[1] is not a private key
```

Validate an address:

```js
if (tronPayments.isValidAddress(depositAddress)) {
  // do something
}
```

Get the public key from a private key:

```js
let address = tronPayments.privateKeyToAddress(privateKey) // for path m/44'/195'/0/1234
if(address === depositAddress){
  console.log('this library works')
} else {
  console.log('better not use this library')
}
```

Get the derived xpub key from a root xprv:

```js
let { xprvToXpub } = require('@faast/tron-payments')
let xpub = xprvToXpub(xprv) // derives path m/44'/195'/0'
```

Get the balance of an address:

```js
let { confirmedBalance, unconfirmedBalance } = await tronPayments.getBalance(1234)
```

Generate a sweep transaction for an address, then broadcast it:

```js
let unsignedTx = await tronPayments.createSweepTransaction(1234, to)
let signedTx = await tronPayments.signTransaction(unsignedTx)
let { id: txHash } = await tronPayments.broadcastTransaction(signedtx)
```

Generate a simple send transaction

```js
let unsignedTx = await tronPayments.createTransaction(1234, to, amountInTrx)
// You still need to sign and broadcast the transaction
```

Get a transaction and check if it is confirmed:

```js
let txInfo = await tronPayments.getTransactionInfo(txHash)
if (txInfo.isConfirmed) {
  // txInfo.confirmations > 0
}
```

*See tests for more utilities*

**Note:** It is suggested to generate your Private key offline with FAR more entropy than the default function, then use xprvToXpub.
You have been warned!

## License

MIT
