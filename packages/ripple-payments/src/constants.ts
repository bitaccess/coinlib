import { FeeLevel } from '@faast/payments-common'
import { RippleCreateTransactionOptions } from './types'

export const PACKAGE_NAME = 'ripple-payments'

export const DECIMAL_PLACES = 6
export const MIN_BALANCE = 20
export const DEFAULT_CREATE_TRANSACTION_OPTIONS: RippleCreateTransactionOptions = { feeLevel: FeeLevel.Medium }
