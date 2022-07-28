import {
  BitcoinishPaymentsUtils,
  createDeterminePathForIndexHelper,
  createDeriveUniPubKeyForPathHelper,
} from './bitcoinish'
import { toBitcoinishConfig } from './utils'
import { BitcoinPaymentsUtilsConfig, AddressType, AddressTypeT } from './types'
import {
  isValidAddress,
  isValidPrivateKey,
  standardizeAddress,
  isValidPublicKey,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'
import { NetworkType } from '@bitaccess/coinlib-common'
import { assertType } from '@bitaccess/ts-common'
import { DEFAULT_ADDRESS_TYPE, BITCOIN_NETWORK_CONSTANTS, NETWORKS } from './constants'

export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: BitcoinPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  isValidAddress(address: string) {
    return isValidAddress(address, this.networkType)
  }

  standardizeAddress(address: string): string | null {
    return standardizeAddress(address, this.networkType)
  }

  isValidPublicKey(privateKey: string) {
    return isValidPublicKey(privateKey, this.networkType)
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
      this.determinePathForIndexFn = createDeterminePathForIndexHelper(BITCOIN_NETWORK_CONSTANTS, functions)
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
      this.deriveUniPubKeyForPathFn = createDeriveUniPubKeyForPathHelper(constants)
    }
    const uniPubKey = this.deriveUniPubKeyForPathFn(seed, derivationPath)
    return uniPubKey
  }
}
