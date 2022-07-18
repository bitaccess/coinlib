import { bitcoinish, AddressType, AddressTypeT } from '@bitaccess/coinlib-bitcoin'
import { NetworkType } from '@bitaccess/coinlib-common'
import { toBitcoinishConfig } from './utils'
import { BitcoinCashPaymentsUtilsConfig, BitcoinCashAddressFormat, BitcoinCashAddressFormatT } from './types'
import {
  isValidAddress,
  isValidPrivateKey,
  isValidPublicKey,
  standardizeAddress,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'
import {
  DEFAULT_ADDRESS_FORMAT,
  DEFAULT_ADDRESS_TYPE,
  COIN_NAME,
  DEFAULT_PURPOSE,
  BITCOINCASH_COINTYPES,
  NETWORKS,
} from './constants'
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
      const constants = {
        coinName: COIN_NAME,
        defaultPurpose: DEFAULT_PURPOSE,
        coinTypes: BITCOINCASH_COINTYPES,
      }
      const functions = {
        isSupportedAddressType,
      }
      this.determinePathForIndexFn = bitcoinish.createDeterminePathForIndexHelper(constants, functions)
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
