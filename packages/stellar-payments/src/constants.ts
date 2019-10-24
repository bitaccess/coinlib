import { NetworkType } from '@faast/payments-common'
import { StellarCreateTransactionOptions } from './types'

export const PACKAGE_NAME = 'stellar-payments'

export const DECIMAL_PLACES = 7
export const BASE_UNITS = 1e7
export const MIN_BALANCE = 1
export const DEFAULT_CREATE_TRANSACTION_OPTIONS: StellarCreateTransactionOptions = {}
export const DEFAULT_TX_TIMEOUT_SECONDS = 5 * 60

export const EXTRA_ID_REGEX = /^[0-9]+$/

export const NOT_FOUND_ERRORS = ['MissingLedgerHistoryError', 'NotFoundError']

export const DEFAULT_NETWORK = NetworkType.Mainnet
export const DEFAULT_MAINNET_SERVER = 'https://horizon.stellar.org'
export const DEFAULT_TESTNET_SERVER = 'https://horizon-testnet.stellar.org'
