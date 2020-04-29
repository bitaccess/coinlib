import { FeeLevel } from '@faast/payments-common'

export const PACKAGE_NAME = 'tron-payments'
export const DECIMAL_PLACES = 6

// Note: Tron doesn't actually have a minimum balance, but 0.1 trx could be burned when sending to
// a new address so we need to keep at least this much around to cover those cases.
export const MIN_BALANCE_SUN = 100000
export const MIN_BALANCE_TRX = 0.1

export const DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'https://api.trongrid.io'
export const DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'https://api.trongrid.io'
export const DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io'
export const DEFAULT_FEE_LEVEL = FeeLevel.Medium

export const TX_EXPIRATION_EXTENSION_SECONDS = 4 * 60

/** Milliseconds to wait past tx expiration before recognizing it as expired. */
export const EXPIRATION_FUDGE_MS = 10 * 1000
