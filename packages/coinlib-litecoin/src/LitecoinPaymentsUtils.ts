import { bitcoinish, AddressType, AddressTypeT } from '@bitaccess/coinlib-bitcoin'
import { toBitcoinishConfig } from './utils'
import { LitecoinPaymentsUtilsConfig, LitecoinAddressFormat, LitecoinAddressFormatT } from './types'
import {
  isValidAddress,
  isValidPrivateKey,
  isValidPublicKey,
  standardizeAddress,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'
import { NetworkType } from '@bitaccess/coinlib-common'
import { assertType, optional } from '@bitaccess/ts-common'
import { DEFAULT_ADDRESS_FORMAT, DEFAULT_ADDRESS_TYPE, LITECOIN_NETWORK_CONSTANTS, NETWORKS } from './constants'

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

  isSupportedAddressType(addressType: string): boolean {
    return isSupportedAddressType(addressType)
  }

  getSupportedAddressTypes(): AddressType[] {
    return getSupportedAddressTypes()
  }

  determinePathForIndex(accountIndex: number, options?: { addressType?: string }): string {
    const addressType = options?.addressType ? assertType(AddressTypeT, options?.addressType) : DEFAULT_ADDRESS_TYPE
    const networkType: NetworkType = this.networkType
    if (!this.determinePathForIndexFn) {
      const functions = {
        isSupportedAddressType,
      }
      this.determinePathForIndexFn = bitcoinish.createDeterminePathForIndexHelper(LITECOIN_NETWORK_CONSTANTS, functions)
    }
    const derivationPath: string = this.determinePathForIndexFn(accountIndex, addressType, networkType)
    return derivationPath
  }

  deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
    if (!this.deriveUniPubKeyForPathFn) {
      const constants = {
        networks: NETWORKS,
        networkType: this.networkType,
      }
      this.deriveUniPubKeyForPathFn = bitcoinish.createDeriveUniPubKeyForPathHelper(constants)
    }
    const uniPubKey = this.deriveUniPubKeyForPathFn(seed, derivationPath)
    return uniPubKey
  }
}
