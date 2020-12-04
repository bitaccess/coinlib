import { BitcoinjsNetwork } from '@faast/bitcoin-payments'
import { FeeLevel, NetworkType } from '@faast/payments-common'
import { networks } from 'bitcoinforksjs-lib'
import { BitcoinCashAddressFormat } from './types'

export const PACKAGE_NAME = 'bitcoin-cash-payments'
export const DECIMAL_PLACES = 8
export const COIN_SYMBOL = 'BCH'
export const COIN_NAME = 'Bitcoin Cash'

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
export const DEFAULT_MIN_TX_FEE = 1

export const DEFAULT_DERIVATION_PATH = "m/44'/145'/0'"

export const DEFAULT_NETWORK = NetworkType.Mainnet

export const NETWORK_MAINNET = networks.bitcoin
export const NETWORK_TESTNET = networks.testnet

export const NETWORKS: { [networkType in NetworkType]: BitcoinjsNetwork } = {
  [NetworkType.Mainnet]: NETWORK_MAINNET,
  [NetworkType.Testnet]: NETWORK_TESTNET,
}

export const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_CASH_SERVER_URL
  ? process.env.BITCOIN_CASH_SERVER_URL.split(',')
  : ['https://bch1.trezor.io', 'https://bch2.trezor.io']
export const DEFAULT_TESTNET_SERVER = ''

export const DEFAULT_FEE_LEVEL = FeeLevel.Low

export const DEFAULT_ADDRESS_FORMAT = BitcoinCashAddressFormat.Cash
