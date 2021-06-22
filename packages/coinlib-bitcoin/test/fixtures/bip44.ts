import { NETWORK_MAINNET } from '../../src'
import { NetworkType } from '@bitaccess/coinlib-common'

export const NETWORK_TYPE = NetworkType.Mainnet
export const NETWORK = NETWORK_MAINNET
export const DERIVATION_PATH = "m/44'/0'/0'"
export const MNEMONIC = 'parent solid gentle select carpet dolphin lunar pass half bleak siege puzzle'
export const ROOT_XPRV = 'xprv9s21ZrQH143K3AVAFiWZgcBVo4CYcuyaLwXNQvefrNjqdUF6WwpXVYrHhmGYJXD5hzuTpvvyRxCfUxEUeRkTBgj1CzsvHBdtheNnBXpuu8p'

/** ROOT_XPRV derived to m/44' */
export const PARTIALLY_DERIVED_XPRV = 'xprv9v7wn2VmtqCdLLAnGnAM2WYig5DSfRDs4qQj7NmmsRsHbLnYy6kLEr2WTYK3rb1sANpZSwG7WbxXaoBjwUD64LteLgFDQtmNNsWcdqbCKgZ'

/** ROOT_XPRV derived to DERIVATION_PATH */
export const DERIVED_XPRV = 'xprv9xvhR1R7yi6TkvbgezfRQdxB3mMLodu3JWvxF2Xggqn9CRJjG4X8qBwGraNDamfCahFTCoGeMrDHB54ndJsqAHY3yvXVK763P2TDyr6Zuqw'

/** XPUB of DERIVED_XPRV */
export const DERIVED_XPUB = 'xpub6Bv3pWx1p5ekyQg9m2CRmmtuboBqD6ctfjrZ3QwJFBK85DdsobqPNzFkhrGTU4eDmZ8abVqkFGRn8RHoQ5n56QVbopdjVUEaA4KeZyAyL7a'

// All of the following are derived from m/44'/0'/0'/0/2
export const PRIVATE_KEY = 'KwkUrkVNsnnPJBkY2BYUi8NXgEemCVBNRYNoD5d3cY8W9UrCJqfH'
export const ADDRESS_LEGACY = '1DbGmkAU9myqs8WkeSVYMN3z7AQWT6o5Fk'
export const ADDRESS_SEGWIT_P2SH = '34AqiNyJqVHwvzzuoyPbE6s3dDDqKb5sr6'
export const ADDRESS_SEGWIT_NATIVE = 'bc1q3gwdz3rhj5dyz60wtc2wdvs7qwver2q6vmy4gp'
export const ADDRESS_SEGWIT_NATIVE_UPPER = 'BC1Q3GWDZ3RHJ5DYZ60WTC2WDVS7QWVER2Q6VMY4GP'
