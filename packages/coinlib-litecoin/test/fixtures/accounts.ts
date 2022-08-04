import { AddressType, SinglesigAddressType } from '../../src'
import { ROOT_XPRV, MNEMONIC } from './bip44'

// Values calculated using https://iancoleman.io/bip39/

export type AccountFixture = {
  derivationPath: string,
  xprv: string,
  xpub: string,
  sweepTxSize: number,
  addresses: {
    [i: number]: string,
  }
}

export const legacyAccount: AccountFixture = {
  derivationPath: "m/44'/2'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 192,
  xpub:
    'xpub6Bvk7TZL7RXk6vMPS3aTszwr57mYGEnWwS1gnoNiE3R7CxvRV6Nq9NChJwoztJG3rwNfyi1G368cfbgjpHyTYQWHqJSMZH4Nb7x7b92oeUF',
  addresses: {
    0: 'Ld1eoAGyDHSr5qp7vPhVYY52M3aGxJQY6N',
    1: 'LLVr1ccv9HSvHuWoZ37cFnZPijKS6s6kwe',
    2: 'LPHRhQyZ4pfUzbT4L7NmAHU51B66QfsPQm',
    5: 'LMgUa9dFEVDkxhuZVqUeA61qJhsi9r8b1d',
    6: 'LWrc4hWqZuQrgAWBRf7QEyx2iSQBV9vRvn',
    10: 'LKTpBfsFfph85Ri1Va7MoP3SBHT8n6KXEW',
    10000: 'LLudzbXqs5qYvAA4W53Cv9AbSJG1J5NCsJ',
    20000: 'LQi4pdfoL72Cc8RnMuvyGREkH1f4YBwZ6Y'
  },
}

export const p2shSegwitAccount: AccountFixture = {
  derivationPath: "m/49'/2'/0'",
  sweepTxSize: 133,
  xprv: ROOT_XPRV,
  xpub:
    'xpub6Cn2FkCfvpJ4FTLGNyWwDTWhhgEpyF3fh3MXcH5uqrtSuHDKJHbkoJ5cCLD2uHQrHpCj7oL3eevz2hQoWuBMk3PvSXop7cimc6RbG8aKiCE',
  addresses: {
    0: 'MFmobJTz7V7nwe58hEw7kucxZ13P7ZSn7c',
    1: 'MAW7KQXPthRZ52Ph2kbgzuDCLgeF82E4X4',
    2: 'MDqjJmf5zqMcmf9wrgiQEXPrx1M6WqTCWH',
    5: 'MW7wNjZvLrEqVGgmHrkwUad8skHpoUEYKD',
    6: 'MKkRm1HcpebFwSaGzVw67pqhKPHUkw3XxZ',
    10: 'MBSKXC2mRXMi3Dg8knyPdufHeTqDNMTNYm',
    10000: 'MT2WjBDLf2fwfCxEYjuHmXvzhQ1w3eo6mT',
    20000: 'MA5wacex6QnYVKfB6w3qQMq4chWerFsVQw',
  },
}

export const nativeSegwitAccount: AccountFixture = {
  derivationPath: "m/84'/2'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 109,
  xpub:
    'xpub6BrXLvkCQFCuJVqbEyhdduV1E2yoEch3WDcioqExPPQwt6v6CWAvj5RkyRPx6cQr9ABoT21J3bJzZnJuKZwpzS2qSvieggedQ3f7JcjwKPx',
  addresses: {
    0: 'ltc1qgux208qk8ja705ezz4tw43qs74tllyqsfd389g',
    1: 'ltc1qucrmc6gwq8pa9zdp7c702u0j9te0hr8a5zwkd9',
    2: 'ltc1qgp60ny70xpkk42efl8wsepxshxzfwmpefjy6za',
    5: 'ltc1q8f957ftf684w77knh0pz2y3ps35waqyyzu8ntz',
    6: 'ltc1qyv5k9fhkwnpm0y7qzkaeq293jzzx5x5n7hmr5v',
    10: 'ltc1qdr4mf0cutz7xs09mg68030apax7qvy66gdqw3d',
    10000: 'ltc1qtylwn2xevelzlvmdnvufw0gpc5napskwjkgxpd',
    20000: 'ltc1qx3cttwxka3eh0k02jlcduhvqcagphd0ksrrj4h',
  },
}

export const accountsByAddressType: { [type in SinglesigAddressType]: AccountFixture } = {
  [AddressType.Legacy]: legacyAccount,
  [AddressType.SegwitP2SH]: p2shSegwitAccount,
  [AddressType.SegwitNative]: nativeSegwitAccount,
}



export type SeedAccountFixture = {
  seed: string,
  derivationPath: string,
  xpub: string,
  addresses: {
    [i: number]: string,
  }
}

export const seedLegacyAccount: SeedAccountFixture = {
  ...legacyAccount,
  seed: MNEMONIC
}

export const seedP2shSegwitAccount: SeedAccountFixture = {
  ...p2shSegwitAccount,
  seed: MNEMONIC
}

export const seedNativeSegwitAccount: SeedAccountFixture = {
  ...nativeSegwitAccount,
  seed: MNEMONIC
}

export const seedAccountsByAddressType: { [type in SinglesigAddressType]: SeedAccountFixture } = {
  [AddressType.Legacy]: seedLegacyAccount,
  [AddressType.SegwitP2SH]: seedP2shSegwitAccount,
  [AddressType.SegwitNative]: seedNativeSegwitAccount,
}

export const seedAccountsXPrv = ROOT_XPRV