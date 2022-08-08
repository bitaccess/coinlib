import { NetworkType, FeeLevel, AutoFeeLevels } from '@bitaccess/coinlib-common'
import { RippleCreateTransactionOptions } from './types'

export const PACKAGE_NAME = 'ripple-payments'

export const COIN_SYMBOL = 'XRP'
export const COIN_NAME = 'Ripple' // Yes, I know 'XRP' is the coin name too, but that's just confusing
export const DECIMAL_PLACES = 6
export const MIN_BALANCE = 20
export const DEFAULT_CREATE_TRANSACTION_OPTIONS: RippleCreateTransactionOptions = {}
export const DEFAULT_MAX_LEDGER_VERSION_OFFSET = 1000 // ~60min

/**
 * Source: https://github.com/ripple/ripple-lib/blob/develop/src/common/schemas/objects/address.json
 */
export const ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/

export const EXTRA_ID_REGEX = /^[0-9]+$/

/**
 * Source: crypto-regex
 */
export const XPUB_REGEX = /^xpub[a-km-zA-HJ-NP-Z1-9]{100,108}$/
export const XPRV_REGEX = /^xprv[a-km-zA-HJ-NP-Z1-9]{100,108}$/

export const NOT_FOUND_ERRORS = ['MissingLedgerHistoryError', 'NotFoundError', 'Account not found.', 'actNotFound']
export const CONNECTION_ERRORS = ['ConnectionError', 'NotConnectedError', 'DisconnectedError', 'disconnected', 'code: 1000', 'connection never cleaned up']
export const RETRYABLE_ERRORS = [...CONNECTION_ERRORS, 'TimeoutError', 'The server is too busy to help you now']
export const MAX_API_CALL_RETRIES = 2

export const DEFAULT_NETWORK = NetworkType.Mainnet
export const DEFAULT_MAINNET_SERVER = 'wss://s1.ripple.com'
export const DEFAULT_TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233'

export const DEFAULT_FEE_LEVEL: AutoFeeLevels = FeeLevel.Medium

export const PUBLIC_CONFIG_OMIT_FIELDS = ['logger', 'server', 'api', 'hdKey', 'hotAccount', 'depositAccount']
export const UHD_PAYMENTS_CONFIG_OMIT_FIELDS = [
  'seed',
  'uniPubKey',
]

export const FEE_LEVEL_CUSHIONS = {
  [FeeLevel.Low]: 1,
  [FeeLevel.Medium]: 1.2,
  [FeeLevel.High]: 1.5,
}

export const RIPPLE_COINTYPES = {
  [NetworkType.Mainnet]: '144',
  [NetworkType.Testnet]: '144',
}

// TODO: design address type for Ripple
export const RIPPLE_SUPPORTED_ADDRESS_TYPES: string[] = []