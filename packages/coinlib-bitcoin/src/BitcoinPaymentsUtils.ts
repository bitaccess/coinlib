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
import { AutoFeeLevels, FeeRate, GetFeeRecommendationOptions, NetworkType, FeeLevel, FeeRateType } from '@bitaccess/coinlib-common'
import { assertType } from '@bitaccess/ts-common'
import { DEFAULT_ADDRESS_TYPE, BITCOIN_NETWORK_CONSTANTS, NETWORKS } from './constants'
import request from 'request-promise-native'

export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
  private readonly FEE_LEVEL_TO_MEMPOOL_FIELD = {
    [FeeLevel.High]: 'fastestFee',
    [FeeLevel.Medium]: 'economyFee',
    [FeeLevel.Low]: 'minimumFee',
  }

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

  async getMempoolSpaceFeeRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    let feeRate: string
    let url: string
    const MEMPOOL_SPACE_FEE_URL_MAINNET = process.env.MEMPOOL_SPACE_FEE_URL_MAINNET ?? 'https://mempool.space/api/v1/fees/recommended'
    const MEMPOOL_SPACE_FEE_URL_TESTNET = process.env.MEMPOOL_SPACE_FEE_URL_TESTNET ?? 'https://mempool.space/testnet/api/v1/fees/recommended'
    if (this.networkType === NetworkType.Testnet) url = MEMPOOL_SPACE_FEE_URL_TESTNET
    else url = MEMPOOL_SPACE_FEE_URL_MAINNET
    this.logger.log(`Attempting to use mempool.space for fee rate recommendation for ${this.networkType} network`)
    try {
      const body = await request.get(url, { json: true })
      const feePerKbField = this.FEE_LEVEL_TO_MEMPOOL_FIELD[feeLevel]
      const satPerByte = body[feePerKbField]
      if (!satPerByte) {
        throw new Error(`Response is missing expected field ${feePerKbField}`)
      }
      feeRate = String(satPerByte)
      this.logger.log(
        `Retrieved BTC ${this.networkType} fee rate of ${satPerByte} sat/vbyte from mempool.space for ${feeLevel} level`,
      )
      return {
        feeRate,
        feeRateType: FeeRateType.BasePerWeight,
      }
    } catch (e) {
      throw new Error(`Failed to retrieve BTC ${this.networkType} fee rate from mempool.space - ${e.name}: ${e.message}`)
    }
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels, options: GetFeeRecommendationOptions = {}): Promise<FeeRate> {
    if (options.source === 'mempool') {
      try {
        return await this.getMempoolSpaceFeeRecommendation(feeLevel)
      } catch (e) {
        this.logger.error(`${e.name} - ${e.message}`)
      this.logger.log(
        `Could not use mempool.space for fee rate recommendation, falling back to blockbook with feeLevel ${feeLevel}`,
      )
        return this.getBlockbookFeeRecommendation(feeLevel)
      }
    } else {
      return super.getFeeRateRecommendation(feeLevel, options)
    }
  }
}
