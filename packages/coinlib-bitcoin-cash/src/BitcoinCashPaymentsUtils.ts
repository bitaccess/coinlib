import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { AutoFeeLevels, FeeRate } from '@bitaccess/coinlib-common'
import { toBitcoinishConfig } from './utils'
import { BitcoinCashPaymentsUtilsConfig, BitcoinCashAddressFormat, BitcoinCashAddressFormatT } from './types'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress } from './helpers'
import { DEFAULT_ADDRESS_FORMAT } from './constants'
import { assertType, optional } from '@faast/ts-common'

export class BitcoinCashPaymentsUtils extends bitcoinish.BitcoinishPaymentsUtils {
  readonly validAddressFormat?: BitcoinCashAddressFormat

  constructor(config: BitcoinCashPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.validAddressFormat = config.validAddressFormat
  }

  isValidAddress(address: string, options?: { format?: string }) {
    // prefer argument over configured format, default to any (undefined)
    const format = assertType(optional(BitcoinCashAddressFormatT), options?.format ?? this.validAddressFormat, 'format')
    return isValidAddress(address, this.networkType, format)
  }

  standardizeAddress(address: string, options?: { format?: string }) {
    // prefer argument over configured format, default to cash address
    const format = assertType(
      BitcoinCashAddressFormatT,
      options?.format ?? this.validAddressFormat ?? DEFAULT_ADDRESS_FORMAT,
      'format',
    )
    const standardized = standardizeAddress(address, this.networkType, format)
    if (standardized && address !== standardized) {
      this.logger.log(`Standardized ${this.coinSymbol} address to ${format} format: ${address} -> ${standardized}`)
    }
    return standardized
  }

  isValidPublicKey(publicKey: string) {
    return isValidPublicKey(publicKey, this.networkType)
  }

  isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.networkType)
  }
}
