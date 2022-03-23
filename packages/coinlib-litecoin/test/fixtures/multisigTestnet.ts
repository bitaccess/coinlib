import { AddressType } from '../../src'


export const DERIVATION_PATH = "m/1234'/1'/0'"
export const M = 2

export const ADDRESSES: { [addressType: string]: { [i: number]: string } } = {
    [AddressType.MultisigLegacy]: {
      0: 'QWwrKm3D6JZ4kPFRioh9V7wLihBrri6hEw',
      1: 'QYCXrNcPMx3a5AJqgjyzWbsv4djBdKSgWc',
      2: 'QdfE8XWMC5AA3ZTHYSgcRMc8Fx2sr6Yfr5',
    },
    [AddressType.MultisigSegwitP2SH]: {
      0: 'QbUV5DubYM1VRZiMhG3cGDBUuiRt9aHHMV',
      1: 'QTGpkUGtzRTuZuEGanQ2uqTi2dZzCurjd6',
      2: 'QcnzawrPeFkhsBXQNoLZPYCPetESetRQso',
    },
    [AddressType.MultisigSegwitNative]: {
      0: 'tltc1qs3ym3gltz2uaw8ttrhg779w6k39x2yn5yytnttvhvkpzcxmh6vuqeswq3q',
      1: 'tltc1q93kp525h5mkzhfjm74d7rpja0egnw67ntn2uc8huft6g2q7cy98qcfjgdr',
      2: 'tltc1qcx5u374mjdc745q7nlscdve74szdgsz85sgxmyaszsr6nkum308qv8qhzy',
    },
  }
