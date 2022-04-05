import { AddressType } from '../../src'

export const DERIVATION_PATH = "m/1234'/1'/0'"
export const M = 2

export const TESTNET_ADDRESSES: { [addressType: string]: { [i: number]: string } } = {
  [AddressType.MultisigLegacy]: {
    0: '2ND2FaP69VUERphXimTjwWqtghnxHGdTujX',
    1: '2N85r7PStKV3YSvZ1KVwtb673gYhFnnjHFN',
    2: '2N9ck6QANBWqspwCHr8d3QxXJfxp4bBBpou',
  }
}

export const MAINNET_ADDRESSES: { [addressType: string]: { [i: number]: string } } = {
  [AddressType.MultisigLegacy]: {
    0: '9xYuY7Y8mGA9KxBj5ZaCT7A4ox1TjsENix',
    1: 'AErT8fwUALLC2suqQ5wRvELLWG8PFdfHhP',
    2: 'A12xRLDj7WrkGm4wX5279JRC9XLuuJbnub',
  }
}
