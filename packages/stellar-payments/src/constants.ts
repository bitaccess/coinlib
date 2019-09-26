import { NetworkType } from '@faast/payments-common'
import { StellarCreateTransactionOptions } from './types'

export const PACKAGE_NAME = 'stellar-payments'

export const DECIMAL_PLACES = 6
export const MIN_BALANCE = 20
export const DEFAULT_CREATE_TRANSACTION_OPTIONS: StellarCreateTransactionOptions = {}
export const DEFAULT_MAX_LEDGER_VERSION_OFFSET = 100 // ~6min

/**
 * Source: https://github.com/stellar/stellar-sdk/blob/develop/src/common/schemas/objects/address.json
 */
export const ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/

export const EXTRA_ID_REGEX = /^[0-9]+$/

/**
 * Source: crypto-regex
 */
export const XPUB_REGEX = /^xpub[a-km-zA-HJ-NP-Z1-9]{100,108}$/
export const XPRV_REGEX = /^xprv[a-km-zA-HJ-NP-Z1-9]{100,108}$/

export const NOT_FOUND_ERRORS = ['MissingLedgerHistoryError', 'NotFoundError']

export const DEFAULT_NETWORK = NetworkType.Mainnet
export const DEFAULT_MAINNET_SERVER = 'https://horizon.stellar.org'
export const DEFAULT_TESTNET_SERVER = 'https://horizon-testnet.stellar.org'
