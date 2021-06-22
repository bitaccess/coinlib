import { NETWORK_MAINNET } from '../../src'
import { NetworkType } from '@faast/payments-common'

export const NETWORK_TYPE = NetworkType.Mainnet
export const NETWORK = NETWORK_MAINNET
export const DERIVATION_PATH = "m/44'/3'/0'"
export const MNEMONIC = 'parent solid gentle select carpet dolphin lunar pass half bleak siege puzzle'
export const ROOT_XPRV = 'xprv9s21ZrQH143K3AVAFiWZgcBVo4CYcuyaLwXNQvefrNjqdUF6WwpXVYrHhmGYJXD5hzuTpvvyRxCfUxEUeRkTBgj1CzsvHBdtheNnBXpuu8p'

/** ROOT_XPRV derived to m/44' */
export const PARTIALLY_DERIVED_XPRV = 'xprv9v7wn2VmtqCdLLAnGnAM2WYig5DSfRDs4qQj7NmmsRsHbLnYy6kLEr2WTYK3rb1sANpZSwG7WbxXaoBjwUD64LteLgFDQtmNNsWcdqbCKgZ'

/** ROOT_XPRV derived to DERIVATION_PATH */
export const DERIVED_XPRV = 'xprv9z6PcB7K7hYFdyDJ69Xzoxs5kZ2ujB7y2E3QpF8dbbgZWcv6fo8XfbtWzQ9WFN8uzfcwYKhKKRFgN3fEicwu2TC1nLFCoFgKiHAsE8PGAmL'

/** XPUB of DERIVED_XPRV */
export const DERIVED_XPUB = 'xpub6D5k1geCx56YrTHmCB51B6opJasQ8dqpPSy1cdYF9wDYPRFFDLSnDQCzqfXEHSYsCS4LJerruc5Rdd5uL8gPEkHu4UxCVtoa7xjgzWhRgkf'

// All of the following are derived from m/44'/3'/0'/0/2
export const PRIVATE_KEY = 'QRaq8CwiNvLzYSXJjbWqd3CCpiML2J5VeAPMeozPixbG5QNDpYi1'
export const ADDRESS_VALID = 'DRizV6jMk714avw1xcAxNGwwZsRnNfuRuY'
