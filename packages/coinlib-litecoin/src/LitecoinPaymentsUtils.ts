import { bitcoinish, AddressType } from '@bitaccess/coinlib-bitcoin'
import { toBitcoinishConfig } from './utils'
import { LitecoinPaymentsUtilsConfig, LitecoinAddressFormat, LitecoinAddressFormatT } from './types'
import {
  isValidAddress,
  isValidPrivateKey,
  isValidPublicKey,
  standardizeAddress,
  determinePathForIndex,
  deriveUniPubKeyForPath,
} from './helpers'
import { NetworkType } from '@bitaccess/coinlib-common'
import { assertType, optional } from '@faast/ts-common'
import { DEFAULT_ADDRESS_FORMAT } from './constants'

export class LitecoinPaymentsUtils extends bitcoinish.BitcoinishPaymentsUtils {
  readonly validAddressFormat?: LitecoinAddressFormat

  constructor(config: LitecoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.validAddressFormat = config.validAddressFormat
  }

  isValidAddress(address: string, options?: { format?: string }) {
    // prefer argument over configured format, default to any (undefined)
    const format = assertType(optional(LitecoinAddressFormatT), options?.format ?? this.validAddressFormat, 'format')
    return isValidAddress(address, this.networkType, format)
  }

  standardizeAddress(address: string, options?: { format?: string }) {
    // prefer argument over configured format, default to cash address
    const format = assertType(
      LitecoinAddressFormatT,
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

  determinePathForIndex(accountIndex: number, addressType?: AddressType): string {
    const networkType: NetworkType = this.networkType
    const derivationPath: string = determinePathForIndex(accountIndex, addressType, networkType)
    return derivationPath
  }

  deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
    const uniPubKey: string = deriveUniPubKeyForPath(seed, derivationPath)
    return uniPubKey
  }
}
