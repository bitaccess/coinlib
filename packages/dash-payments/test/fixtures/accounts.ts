import { AddressType, SinglesigAddressType } from '../../src'
import { ROOT_XPRV } from './bip44'

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
  derivationPath: "m/44'/5'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 192,
  xpub:
    'xpub6DHbFgdUSMC5tWiA5H15RYpDyfYfidhDLePjEw9VBXgZJ1HmabfbGxHmT73x4QKZ775h37NhvcjrRF7PxWr6Qpi6PSZi4qduYN8sG6JdfUj',
  addresses: {
    '0': 'XghidmSvn3WLr7CkfJXkRXn86HCpceLpqZ',
    '1': 'XroMWF13yM9oXKtf4KRwfhdLfJzUW6dbh4',
    '2': 'XoDNufd3E9T2mdyqfMZjvEKxN45H8Sw8Z2',
    '5': 'XciUQEUxmHSGkgwMeWtJ3z1P7AbUXahWku',
    '6': 'XpPnVQ2nkne8ERLWkKHXE33DJzaM9Mhoxo',
    '10': 'XcRQ3SsfmomqofNqpeTdvJFKaJKFvRZnwX',
    '10000': 'Xdum64yWfkMn6h6pvE99keL7YU8RqM1hh7',
    '20000': 'XcjCMyTXSsps7Rwcus7BLgasVhFYA9zc7j'
  },
}

export const accountsByAddressType: { [type in SinglesigAddressType]: AccountFixture } = {
  [AddressType.Legacy]: legacyAccount,
}
