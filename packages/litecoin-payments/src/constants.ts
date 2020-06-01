import { FeeLevel, NetworkType } from '@faast/payments-common'
import { networks } from 'bitcoinjs-lib'
import { AddressType, SinglesigAddressType } from './types';

export const PACKAGE_NAME = 'litecoin-payments'
export const DECIMAL_PLACES = 8
export const COIN_SYMBOL = 'LTC'
export const COIN_NAME = 'Litecoin'

/**
 * The minimum value a transaction output must be in order to not get rejected by the network.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_DUST_THRESHOLD = 546

/**
 * The minimum fee required by *most* nodes to relay a transaction.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000

/** Sequence to use for each input such that RBF is opted into */
export const LITECOIN_SEQUENCE_RBF = 0xFFFFFFFD

/**
 * The minimum fee this library should ever use for a transaction (overrides recommended levels).
 *
 * Unit: `sat/byte`
 */
export const DEFAULT_MIN_TX_FEE = 5

export const DEFAULT_SINGLESIG_ADDRESS_TYPE: SinglesigAddressType = AddressType.SegwitNative

export const DEFAULT_DERIVATION_PATHS = {
  [AddressType.Legacy]: "m/44'/2'/0'",
  [AddressType.SegwitP2SH]: "m/49'/2'/0'",
  [AddressType.SegwitNative]: "m/84'/2'/0'",
}

export const DEFAULT_NETWORK = NetworkType.Mainnet

export const NETWORK_MAINNET = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0
}

export const NETWORK_TESTNET = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'tltc',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x6f,
  scriptHash: 0x3a,
  wif: 0xef
}

export const DEFAULT_MAINNET_SERVER = process.env.LITECOIN_SERVER_URL
  ? process.env.LITECOIN_SERVER_URL.split(',')
  : ['https://ltc1.trezor.io', 'https://ltc2.trezor.io']
export const DEFAULT_TESTNET_SERVER = '' // will default to mainnet due to not testing LTC testnet

export const DEFAULT_FEE_LEVEL = FeeLevel.Medium
export const DEFAULT_SAT_PER_BYTE_LEVELS = {
  [FeeLevel.High]: 50,
  [FeeLevel.Medium]: 25,
  [FeeLevel.Low]: 10,
}
