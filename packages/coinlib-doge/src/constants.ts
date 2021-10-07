import { FeeLevel, NetworkType } from '@bitaccess/coinlib-common'
import { BitcoinjsNetwork, bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { AddressType, SinglesigAddressType } from './types'

export const PACKAGE_NAME = 'doge-payments'
export const DECIMAL_PLACES = 8
export const COIN_SYMBOL = 'DOGE'
export const COIN_NAME = 'Dogecoin'

//// Most nodes require 1 DOGE minimum fee and dust threshold
//// https://github.com/dogecoin/dogecoin/issues/1650

/**
 * The minimum value a transaction output must be in order to not get rejected by the network.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_DUST_THRESHOLD = 1e8

/**
 * The minimum fee required by *most* nodes to relay a transaction.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_NETWORK_MIN_RELAY_FEE = 1e8

/** Sequence to use for each input such that RBF is opted into */
export const BITCOIN_SEQUENCE_RBF = 0xFFFFFFFD

/**
 * The minimum fee this library should ever use for a transaction (overrides recommended levels).
 *
 * Unit: `sat/byte`
 */
export const DEFAULT_MIN_TX_FEE = 1000000 // 10 DOGE per kb

export const SINGLESIG_ADDRESS_TYPE: SinglesigAddressType = AddressType.Legacy

export const DEFAULT_DERIVATION_PATH = "m/44'/3'/0'"

export const DEFAULT_NETWORK = NetworkType.Mainnet

export const NETWORK_MAINNET = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'dogecoin',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e
}
export const NETWORK_TESTNET = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'dogeTest',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x71,
  scriptHash: 0xc4,
  wif: 0xf1
}

export const NETWORKS: { [networkType in NetworkType]: BitcoinjsNetwork } = {
  [NetworkType.Mainnet]: NETWORK_MAINNET,
  [NetworkType.Testnet]: NETWORK_TESTNET,
}

export const DEFAULT_MAINNET_SERVER = process.env.DOGECOIN_SERVER_URL
  ? process.env.DOGECOIN_SERVER_URL.split(',')
  : ['https://doge1.trezor.io', 'https://doge2.trezor.io']
export const DEFAULT_TESTNET_SERVER = ''

export const DEFAULT_FEE_LEVEL = FeeLevel.High

// dogecoin estimatefee only works for targets between 3 and 25
export const DEFAULT_FEE_LEVEL_BLOCK_TARGETS: bitcoinish.FeeLevelBlockTargets = {
  [FeeLevel.High]: 3,
  [FeeLevel.Medium]: 12,
  [FeeLevel.Low]: 24,
}
