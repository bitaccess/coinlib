import { bitcoinish, AddressType, AddressTypeT } from '@bitaccess/coinlib-bitcoin'
import { NetworkType } from '@bitaccess/coinlib-common'
import { toBitcoinishConfig } from './utils'
import { DogePaymentsUtilsConfig } from './types'
import {
  isValidAddress,
  isValidPrivateKey,
  isValidPublicKey,
  standardizeAddress,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'
import {
  DEFAULT_FEE_LEVEL_BLOCK_TARGETS,
  DEFAULT_ADDRESS_TYPE,
  NETWORKS,
  COIN_NAME,
  DEFAULT_PURPOSE,
  DOGE_COINTYPES,
} from './constants'
import { assertType } from '@bitaccess/ts-common'


export class DogePaymentsUtils extends bitcoinish.BitcoinishPaymentsUtils {
  constructor(config: DogePaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
    this.feeLevelBlockTargets = config.feeLevelBlockTargets ?? DEFAULT_FEE_LEVEL_BLOCK_TARGETS
  }

  isValidAddress(address: string) {
    return isValidAddress(address, this.networkType)
  }

  standardizeAddress(address: string) {
    return standardizeAddress(address, this.networkType)
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
        coinTypes: DOGE_COINTYPES,
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
