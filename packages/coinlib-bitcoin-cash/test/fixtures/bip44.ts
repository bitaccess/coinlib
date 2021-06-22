import { NETWORK_MAINNET } from '../../src'
import { NetworkType } from '@bitaccess/coinlib-common'

export const NETWORK_TYPE = NetworkType.Mainnet
export const NETWORK = NETWORK_MAINNET
export const DERIVATION_PATH = "m/44'/145'/0'"
export const MNEMONIC = 'parent solid gentle select carpet dolphin lunar pass half bleak siege puzzle'
export const ROOT_XPRV = 'xprv9s21ZrQH143K3AVAFiWZgcBVo4CYcuyaLwXNQvefrNjqdUF6WwpXVYrHhmGYJXD5hzuTpvvyRxCfUxEUeRkTBgj1CzsvHBdtheNnBXpuu8p'

/** ROOT_XPRV derived to m/44' */
export const PARTIALLY_DERIVED_XPRV = 'xprv9v7wn2VmtqCdLLAnGnAM2WYig5DSfRDs4qQj7NmmsRsHbLnYy6kLEr2WTYK3rb1sANpZSwG7WbxXaoBjwUD64LteLgFDQtmNNsWcdqbCKgZ'

/** ROOT_XPRV derived to DERIVATION_PATH */
export const DERIVED_XPRV = 'xprv9zQiTo8GrLL7QdFTrE5uMHyfRHX5MnMRrYd4jLdcngW5MEofTU8e6gEj2PuifWqS9ZPyzWEm3KjMf2eMZjEpYbM6vRWeKJEfqc5MvsiRfQY'

/** XPUB of DERIVED_XPRV */
export const DERIVED_XPUB = 'xpub6DQ4sJfAghtQd7KvxFcuiRvPyKMZmF5HDmYfXj3EM234E38p11SteUZCsiAzhQJ8BQzyPC93yRdkmD42MnCHSW5oUWZeHaMiJPCrApczkwD'

// All of the following are derived from m/44'/145'/0'/0/2
export const PRIVATE_KEY = 'L4kA1HDcMV6mfJhuXVErhJkCKHYFbQx796rrLxJ1hzZyrdshX1o8'
export const ADDRESS_CASH = 'bitcoincash:qq60dskvul43sl4xgp202ccwkzc8ytk6wgl5wzlhk2'
export const ADDRESS_BITPAY = 'CMHwKGSgk5NGi2ZxUwetE11aiKSMmX5L8Q'
export const ADDRESS_LEGACY = '15q3kE6cs2PjotfXoCKxeVPZ6CDwrsvMR8'
