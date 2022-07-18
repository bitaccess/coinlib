import { NetworkType, FeeLevel } from '@bitaccess/coinlib-common'
import { StellarCreateTransactionOptions } from './types'

export const PACKAGE_NAME = 'stellar-payments'

export const COIN_SYMBOL = 'XLM'
export const COIN_NAME = 'Stellar'
export const DECIMAL_PLACES = 7
export const BASE_UNITS = 1e7
export const MIN_BALANCE = 1
export const DEFAULT_CREATE_TRANSACTION_OPTIONS: StellarCreateTransactionOptions = {}
export const DEFAULT_TX_TIMEOUT_SECONDS = 60 * 60
export const DEFAULT_FEE_LEVEL = FeeLevel.Low

export const NOT_FOUND_ERRORS = ['MissingLedgerHistoryError', 'NotFoundError', 'Not Found']

export const DEFAULT_NETWORK = NetworkType.Mainnet
export const DEFAULT_MAINNET_SERVER = 'https://horizon.stellar.org'
export const DEFAULT_TESTNET_SERVER = 'https://horizon-testnet.stellar.org'

export const PUBLIC_CONFIG_OMIT_FIELDS = ['logger', 'server', 'api', 'seed', 'depositAccount', 'hotAccount', 'hdKey']

export const STELLAR_COINTYPES = {
  [NetworkType.Mainnet]: '148',
  [NetworkType.Testnet]: '148',
}

export const STELLAR_SUPPORTED_ADDRESS_TYPES: string[] = []