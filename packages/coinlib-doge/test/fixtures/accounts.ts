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
  derivationPath: "m/44'/3'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 192,
  xpub:
    'xpub6CHVE7XJJHooX3pFQSxi733aXzjeLgbVMimR3kvTfYx1cPtBmEaJT6bn3CJDhdysxbYes8yH1yNEX8dJxSTBxgBD6GUmsGrzGmsAKEax96X',
  addresses: {
    '0': 'DQC35AaSvGBVLHXiAeujsXVRbGiE99ZL52',
    '1': 'DG2txzg59KNPTCzGXraZAh1zaWJmEdgarY',
    '2': 'DHiuGDniBNJKdTXJiSMvC5FfsoHqN8qpsn',
    '5': 'DPE5CgmvRDFCqSoiKNbqhHDvdZX3GYBhus',
    '6': 'DQZb8FC9PpqMZfVFwVR6UnCB5YgT67D4Vz',
    '10': 'DC2uUxHtZdSAQ67WgZ7rMw1rKFAheKBu7F',
    '10000': 'DQuTrS22J4yCHRotbSNEnE1gnwBaR7YjN6',
    '20000': 'DGEgJ5j44HWG1sXgsn7zS1Yi5DPzQXbMeq'
  },
}

export const accountsByAddressType: { [type in SinglesigAddressType]: AccountFixture } = {
  [AddressType.Legacy]: legacyAccount,
}
