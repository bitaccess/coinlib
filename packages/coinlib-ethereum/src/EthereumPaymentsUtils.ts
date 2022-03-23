import Web3 from 'web3'
import {
  PaymentsUtils,
  Payport,
  AutoFeeLevels,
  FeeRate,
  FeeRateType,
  NetworkType,
  BalanceResult,
  TransactionStatus,
  BlockInfo,
  BigNumber,
} from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, assertType, isNull, Numeric, isNumber } from '@faast/ts-common'
import Contract from 'web3-eth-contract'

import {
  PACKAGE_NAME,
  ETH_DECIMAL_PLACES,
  ETH_NAME,
  ETH_SYMBOL,
  DEFAULT_ADDRESS_FORMAT,
  MIN_SWEEPABLE_WEI,
  TOKEN_METHODS_ABI,
} from './constants'
import {
  EthereumAddressFormat,
  EthereumAddressFormatT,
  EthereumPaymentsUtilsConfig,
  EthereumTransactionInfo,
} from './types'
import { isValidXkey } from './bip44'
import { NetworkData } from './NetworkData'
import { retryIfDisconnected } from './utils'
import { UnitConvertersUtil } from './UnitConvertersUtil'

export class EthereumPaymentsUtils extends UnitConvertersUtil implements PaymentsUtils {
  readonly networkType: NetworkType
  readonly coinSymbol: string
  readonly coinName: string
  readonly coinDecimals: number
  readonly tokenAddress?: string

  logger: Logger
  server: string | null
  web3: Web3
  eth: Web3['eth']
  networkData: NetworkData

  constructor(config: EthereumPaymentsUtilsConfig) {
    super({ coinDecimals: config.decimals })

    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.networkType = config.network || NetworkType.Mainnet

    if (config.tokenAddress) {
      // ERC20 case
      if (!config.name) {
        throw new Error(`Expected config.name to be provided for tokenAddress ${this.tokenAddress}`)
      }
      if (!config.symbol) {
        throw new Error(`Expected config.symbol to be provided for tokenAddress ${this.tokenAddress}`)
      }
      if (!config.decimals) {
        throw new Error(`Expected config.decimals to be provided for tokenAddress ${this.tokenAddress}`)
      }
    } else {
      // ether case
      if (config.name && config.name !== ETH_NAME) {
        throw new Error(`Unexpected config.name ${config.name} provided without config.tokenAddress`)
      }
      if (config.symbol && config.symbol !== ETH_SYMBOL) {
        throw new Error(`Unexpected config.symbol ${config.symbol} provided without config.tokenAddress`)
      }
      if (config.decimals && config.decimals !== ETH_DECIMAL_PLACES) {
        throw new Error(`Unexpected config.decimals ${config.decimals} provided without config.tokenAddress`)
      }
    }

    this.tokenAddress = config.tokenAddress?.toLowerCase()
    this.coinName = config.name ?? ETH_NAME
    this.coinSymbol = config.symbol ?? ETH_SYMBOL
    this.coinDecimals = config.decimals ?? ETH_DECIMAL_PLACES
    this.server = config.fullNode || null

    let provider: any
    if (config.web3) {
      this.web3 = config.web3
    } else if (isNull(this.server)) {
      this.web3 = new Web3()
    } else if (this.server.startsWith('http')) {
      provider = new Web3.providers.HttpProvider(this.server, config.providerOptions)
      this.web3 = new Web3(provider)
    } else if (this.server.startsWith('ws')) {
      provider = new Web3.providers.WebsocketProvider(this.server, config.providerOptions)
      this.web3 = new Web3(provider)
    } else {
      throw new Error(`Invalid ethereum payments fullNode, must start with http or ws: ${this.server}`)
    }

    // Debug mode to print out all outgoing req/res
    if (provider && process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes('ethereum-payments')) {
      const send = provider.send
      provider.send = (payload: any, cb: Function) => {
        this.logger.debug(`web3 provider request ${this.server}`, payload)
        send.call(provider, payload, (error: Error, result: any) => {
          if (error) {
            this.logger.debug(`web3 provider response error ${this.server}`, error)
          } else {
            this.logger.debug(`web3 provider response result ${this.server}`, result)
          }
          cb(error, result)
        })
      }
    }

    this.eth = this.web3.eth

    this.networkData = new NetworkData({
      web3Config: {
        web3: this.web3,
        fullNode: config.fullNode,
        decimals: config.decimals,
        providerOptions: config.providerOptions,
        tokenAddress: config.tokenAddress,
      },
      parityUrl: config.parityNode,
      logger: this.logger,
      blockBookConfig: {
        nodes: this.server,
      },
      gasStationUrl: config.gasStation,
    })
  }

  async init() {}
  async destroy() {}

  isValidAddress(address: string, options: { format?: string } = {}): boolean {
    const { format } = options
    if (format === EthereumAddressFormat.Lowercase) {
      return this.web3.utils.isAddress(address) && address === address.toLowerCase()
    } else if (format === EthereumAddressFormat.Checksum) {
      return this.web3.utils.checkAddressChecksum(address)
    }
    return this.web3.utils.isAddress(address)
  }

  standardizeAddress(address: string, options?: { format?: string }): string | null {
    if (!this.web3.utils.isAddress(address)) {
      return null
    }
    const format = assertType(EthereumAddressFormatT, options?.format ?? DEFAULT_ADDRESS_FORMAT, 'format')
    if (format === EthereumAddressFormat.Lowercase) {
      return address.toLowerCase()
    } else {
      return this.web3.utils.toChecksumAddress(address)
    }
  }

  isValidExtraId(extraId: unknown): boolean {
    return false
  }

  // XXX Payport methods can be moved to payments-common
  isValidPayport(payport: Payport): payport is Payport {
    return Payport.is(payport) && !this._getPayportValidationMessage(payport)
  }

  validatePayport(payport: Payport): void {
    const message = this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  getPayportValidationMessage(payport: Payport): string | undefined {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e.message
    }
    return this._getPayportValidationMessage(payport)
  }

  isValidXprv(xprv: string): boolean {
    return isValidXkey(xprv) && xprv.substring(0, 4) === 'xprv'
  }

  isValidXpub(xpub: string): boolean {
    return isValidXkey(xpub) && xpub.substring(0, 4) === 'xpub'
  }

  isValidPrivateKey(prv: string): boolean {
    try {
      return Boolean(this.web3.eth.accounts.privateKeyToAccount(prv))
    } catch (e) {
      return false
    }
  }

  privateKeyToAddress(prv: string): string {
    let key: string
    if (prv.substring(0, 2) === '0x') {
      key = prv
    } else {
      key = `0x${prv}`
    }

    return this.web3.eth.accounts.privateKeyToAccount(key).address.toLowerCase()
  }

  private _getPayportValidationMessage(payport: Payport): string | undefined {
    try {
      const { address } = payport
      if (!this.isValidAddress(address)) {
        return 'Invalid payport address'
      }
    } catch (e) {
      return 'Invalid payport address'
    }
    return undefined
  }

  async getFeeRateRecommendation(level: AutoFeeLevels): Promise<FeeRate> {
    const gasPrice = await this.networkData.getGasPrice(level)
    return {
      feeRate: gasPrice,
      feeRateType: FeeRateType.BasePerWeight,
    }
  }

  async _retryDced<T>(fn: () => Promise<T>): Promise<T> {
    return retryIfDisconnected(fn, this.logger)
  }

  async getCurrentBlockNumber() {
    return this.networkData.getCurrentBlockNumber()
  }

  isAddressBalanceSweepable(balanceEth: Numeric): boolean {
    return this.toBaseDenominationBigNumberEth(balanceEth).gt(MIN_SWEEPABLE_WEI)
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string): Promise<BalanceResult> {
    return this.networkData.getAddressBalanceERC20(address, tokenAddress)
  }

  async getAddressBalance(address: string): Promise<BalanceResult> {
    if (this.tokenAddress) {
      return this.getAddressBalanceERC20(address, this.tokenAddress)
    }

    return this.networkData.getAddressBalance(address)
  }

  async getAddressNextSequenceNumber(address: string) {
    return this.networkData.getNonce(address)
  }

  async getAddressUtxos() {
    return []
  }

  async getTransactionInfoERC20(txid: string): Promise<EthereumTransactionInfo> {
    return this.networkData.getTransactionInfoERC20(txid)
  }

  async getTransactionInfo(txid: string): Promise<EthereumTransactionInfo> {
    return this.networkData.getTransactionInfo(txid, this.tokenAddress)
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    return this.networkData.getBlock(id ?? 'latest')
  }
}
