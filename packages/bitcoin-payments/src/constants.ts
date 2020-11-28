import { FeeLevel, NetworkType } from '@faast/payments-common'
import { networks } from 'bitcoinjs-lib'
import { AddressType, SinglesigAddressType, MultisigAddressType } from './types';

export const PACKAGE_NAME = 'bitcoin-payments'
export const DECIMAL_PLACES = 8
export const COIN_SYMBOL = 'BTC'
export const COIN_NAME = 'Bitcoin'

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
export const BITCOIN_SEQUENCE_RBF = 0xFFFFFFFD

/**
 * The minimum fee this library should ever use for a transaction (overrides recommended levels).
 *
 * Unit: `sat/byte`
 */
export const DEFAULT_MIN_TX_FEE = 5

export const DEFAULT_SINGLESIG_ADDRESS_TYPE: SinglesigAddressType = AddressType.SegwitNative
export const DEFAULT_MULTISIG_ADDRESS_TYPE: MultisigAddressType = AddressType.MultisigSegwitNative

export const DEFAULT_DERIVATION_PATHS = {
  [AddressType.Legacy]: "m/44'/0'/0'",
  [AddressType.SegwitP2SH]: "m/49'/0'/0'",
  [AddressType.SegwitNative]: "m/84'/0'/0'",
}

export const DEFAULT_NETWORK = NetworkType.Mainnet

export const NETWORK_MAINNET = networks.bitcoin
export const NETWORK_TESTNET = networks.testnet

export const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL
  ? process.env.BITCOIN_SERVER_URL.split(',')
  : ['https://btc1.trezor.io', 'https://btc2.trezor.io']
export const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL
  ? process.env.BITCOIN_TESTNET_SERVER_URL.split(',')
  : ['https://tbtc1.trezor.io', 'https://tbtc2.trezor.io']

export const DEFAULT_FEE_LEVEL = FeeLevel.Medium
export const DEFAULT_SAT_PER_BYTE_LEVELS = {
  [FeeLevel.High]: 100,
  [FeeLevel.Medium]: 50,
  [FeeLevel.Low]: 25,
}

export const PUBLIC_CONFIG_OMIT_FIELDS = ['logger', 'server', 'hdKey', 'keyPairs', 'blockcypherToken']
