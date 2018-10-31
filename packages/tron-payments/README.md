tron-payments
=================

Library to assist in payment processing on tron. It first allows for generation
of address according to the [BIP44 standard](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki).

[Bitcore](https://bitcore.io/) is used for  deterministic public and private keys.
Please see the BIP32 standard for more information ([BIP32](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)).

Some work is inspired off of the prior work done by [tron-bip44](https://github.com/trapp/tron-bip44)

Coming soon: tools to sign transactions passed down from the server connected to web3.

## Getting Started

```bash
npm install --save tron-payments
```

Create a new wallet (DON'T DO THIS ON PRODUCTION):
```js
let tronPayments = require('@faast/tron-payments')()
let keys = tronPayments.generateNewKeys()
console.log(keys.xpub)
console.log(keys.xprv)
```

Generate an tron deposit address from a public seed (xpub).
This is useful if you are a hot wallet and don't store the private key. You will need
to keep track of which path node you are on (increasing INT):
```js
let depositAddress = tronPayments.bip44(keys.xpub, 1234) // for path m/44'/195'/0'/0/1234
console.log(depositAddress)
```

Get the private key for an address on a specific path:
```js
let privateKey = tronPayments.getPrivateKey(keys.xprv, 1234) // for path m/44'/195'/0'/0/1234
```

Get the public key from a private key:
```js
let address = tronPayments.privateToPublic(privateKey) // for path m/44'/195'/0'/0/1234
if(address === depositAddress){
  console.log('this library works')
} else {
  console.log('better not use this library')
}
```

Get the derived xpub key from a hardened private key:
```js
let xpub = tronPayments.getXpubFromXprv(xprv) // for path m/44'/195'/0'/0/1234
```





**Note:** It is suggested to generate your Private key offline with FAR more entropy than the default function, then use getXpubFromXprv.
You have been warned!

## License

MIT
