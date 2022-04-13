import { AddressType } from '../../src'

export const DERIVATION_PATH = "m/1234'/1'/0'"
export const M = 2

export const TESTNET_ADDRESSES: { [addressType: string]: { [i: number]: string } } = {
  [AddressType.MultisigLegacy]: {
    0: 'bchtest:ppchx9q09qyvelcug83ek78yxrssuxtu8ynngvtw6f',  //  2N3b6CkAy5CVycCVP6hf8QRVuaJk32yCGjg
    1: 'bchtest:pplnyps4v5ugvf039hrw9lhghz7hwtzlhq0cx8ttmn',  //  2N4qmjMk9LqzUvyYo4dwyRuSUvFHMgXGnuC
    2: 'bchtest:pza3w9e2jtl99wrzttqegxa02aud6yvysu2taka26h',  //  2NAJU1We7Ay74uNhEvLebLfAh7Zb3yzBHY6
  }
}

export const MAINNET_ADDRESSES: { [addressType: string]: { [i: number]: string } } = {
  [AddressType.MultisigLegacy]: {
    0: '37oeoGUEhCHFRapFfRunCyXh7NdRfj5EKF',
    1: '3Q7CPpsa6GTJ8WYMyxH1g6hxogkMCxRcvD',
    2: '3AHhgV9q3SyrNPhU6wMguAnpSwxsqvaR9A',
  }
}
