import { FeeLevel } from 'payments-common'

export const FEE_FOR_TRANSFER_SUN = 100000
export const FEE_LEVEL_TRANSFER_SUN = {
  [FeeLevel.Low]: FEE_FOR_TRANSFER_SUN,
  [FeeLevel.Medium]: FEE_FOR_TRANSFER_SUN,
  [FeeLevel.High]: FEE_FOR_TRANSFER_SUN,
}

export const DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'https://api.trongrid.io'
export const DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'https://api.trongrid.io'
export const DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io'
export const DEFAULT_MAX_ADDRESS_SCAN = 10
