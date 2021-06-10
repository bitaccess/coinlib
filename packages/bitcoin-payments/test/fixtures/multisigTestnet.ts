import { AddressType } from '../../src'
import singlesigFixtures from './singlesigTestnet'

export const DERIVATION_PATH = "m/1234'/1'/0'"

export const ADDRESSES: { [addressType: string]: { [i: number]: string } } = {
  [AddressType.MultisigLegacy]: {
    0: '2N3b6CkAy5CVycCVP6hf8QRVuaJk32yCGjg',
    1: '2N4qmjMk9LqzUvyYo4dwyRuSUvFHMgXGnuC',
    2: '2NAJU1We7Ay74uNhEvLebLfAh7Zb3yzBHY6',
  },
  [AddressType.MultisigSegwitP2SH]: {
    0: '2N87ixD3MXExQHNxK5A1bBWk3mKz4FAXYRp',
    1: '2Myv4dTQeyKQpRiUDxgN1q92GtF8AFvbCPS',
    2: '2N9SETvz9d9hcizmMkhJYJqkxWVncmuRxQC',
  },
  [AddressType.MultisigSegwitNative]: {
    0: 'tb1qs3ym3gltz2uaw8ttrhg779w6k39x2yn5yytnttvhvkpzcxmh6vuqxnjpwl',
    1: 'tb1q93kp525h5mkzhfjm74d7rpja0egnw67ntn2uc8huft6g2q7cy98q82wfju',
    2: 'tb1qcx5u374mjdc745q7nlscdve74szdgsz85sgxmyaszsr6nkum308qnyukam',
  },
}

export const M = 2

// Send all our test funds to another address we control
export const EXTERNAL_ADDRESS = singlesigFixtures[AddressType.SegwitNative].addresses[0]
