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
  derivationPath: "m/44'/3'/0'",
  xprv: ROOT_XPRV,  // ??
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

export type SeedAccountFixture = {
  seed: string,
  uniPubKey: string,
  derivationPath: string,
  sweepTxSize: number,
  addresses: {
    [i: number]: string,
  }
}

export const seedLegacyAccount: SeedAccountFixture = {
  seed: MNEMONIC,
  uniPubKey: 'xpub6D5k1geCx56YrTHmCB51B6opJasQ8dqpPSy1cdYF9wDYPRFFDLSnDQCzqfXEHSYsCS4LJerruc5Rdd5uL8gPEkHu4UxCVtoa7xjgzWhRgkf',
  derivationPath: "m/44'/3'/0'",
  sweepTxSize: 192,
  addresses: {
    '0': 'DPsUMWaM1frBNaq3n4qJvK5Vh2VCe7gNij',
    '1': 'DKjcEsNvG3DfY4VAottKKx9pTzGZ17N3j2',
    '2': 'DRizV6jMk714avw1xcAxNGwwZsRnNfuRuY',
    '5': 'D89ZUAeEWVyYWZ6PzkbD1YXwTKpKuBY92Q',
    '6': 'DBA6mNMJ9pgtA6SkNtKvGEZZdf3g77VpTh',
    '10': 'DA97SgA5chqPDYgj46rMFxLR65HWdxYWiB',
    '10000': 'DAZnRgdk6AWzUPcAKo26qNcnVqQ2xuESsF',
    '20000': 'D8BxgjtuYMfH5tsAACBjeQwAwoFYYE4jy9'
  },
}

export const seedLegacyAccountXPrv: string = 'xprv9s21ZrQH143K3AVAFiWZgcBVo4CYcuyaLwXNQvefrNjqdUF6WwpXVYrHhmGYJXD5hzuTpvvyRxCfUxEUeRkTBgj1CzsvHBdtheNnBXpuu8p'


export const seedAccountsByAddressType: { [type in SinglesigAddressType]: SeedAccountFixture } = {
  [AddressType.Legacy]: seedLegacyAccount,
}
