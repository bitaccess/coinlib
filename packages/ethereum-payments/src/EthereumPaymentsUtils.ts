import Web3 from 'web3'
import { PaymentsUtils, Payport, createUnitConverters, AutoFeeLevels, FeeRate, FeeRateType, NetworkType } from '@faast/payments-common'
import {
  Logger,
  DelegateLogger,
  assertType,
  isNull
} from '@faast/ts-common'

import { PACKAGE_NAME, ETH_DECIMAL_PLACES, ETH_NAME, ETH_SYMBOL } from './constants'
import { EthereumPaymentsUtilsConfig } from './types'
import { isValidXkey } from './bip44'
import { NetworkData } from './NetworkData'

type UnitConverters = ReturnType<typeof createUnitConverters>

export class EthereumPaymentsUtils implements PaymentsUtils {
  readonly networkType: NetworkType
  readonly coinSymbol: string
  readonly coinName: string
  readonly coinDecimals: number

  logger: Logger
  server: string | null
  web3: Web3
  eth: Web3['eth']
  gasStation: NetworkData

  constructor(config: EthereumPaymentsUtilsConfig) {
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.networkType = config.network || NetworkType.Mainnet
    this.coinName = config.name ?? ETH_NAME
    this.coinSymbol = config.symbol ?? ETH_SYMBOL
    this.coinDecimals = config.decimals ?? ETH_DECIMAL_PLACES
    this.server = config.fullNode || null
    if (config.web3) {
      this.web3 = config.web3
    } else if (isNull(this.server)) {
      this.web3 = new Web3()
    } else if (this.server.startsWith('http')) {
      this.web3 = new Web3(new Web3.providers.HttpProvider(this.server, config.providerOptions))
    } else if (this.server.startsWith('ws')) {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.server, config.providerOptions))
    } else {
      throw new Error(`Invalid ethereum payments fullNode, must start with http or ws: ${this.server}`)
    }
    this.eth = this.web3.eth
    this.gasStation = new NetworkData(this.eth, config.gasStation, config.parityNode, this.logger)

    const unitConverters = createUnitConverters(this.coinDecimals)
    this.toMainDenominationBigNumber = unitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumber = unitConverters.toBaseDenominationBigNumber
    this.toMainDenomination = unitConverters.toMainDenominationString
    this.toBaseDenomination = unitConverters.toBaseDenominationString

    const ethUnitConverters = createUnitConverters(ETH_DECIMAL_PLACES)
    this.toMainDenominationBigNumberEth = ethUnitConverters.toMainDenominationBigNumber
    this.toBaseDenominationBigNumberEth = ethUnitConverters.toBaseDenominationBigNumber
    this.toMainDenominationEth = ethUnitConverters.toMainDenominationString
    this.toBaseDenominationEth = ethUnitConverters.toBaseDenominationString
  }

  async init() {}
  async destroy() {}

  toMainDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumber: UnitConverters['toMainDenominationBigNumber']
  toMainDenomination: UnitConverters['toMainDenominationString']
  toBaseDenomination: UnitConverters['toBaseDenominationString']

  toMainDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toBaseDenominationBigNumberEth: UnitConverters['toMainDenominationBigNumber']
  toMainDenominationEth: UnitConverters['toMainDenominationString']
  toBaseDenominationEth: UnitConverters['toBaseDenominationString']

  isValidAddress(address: string): boolean {
    return this.web3.utils.isAddress(address)
  }

  isValidExtraId(extraId: unknown): boolean {
    return false
  }

  // XXX Payport methods can be moved to payments-common
  isValidPayport(payport: Payport): boolean {
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
      if (!(this.isValidAddress(address))) {
        return 'Invalid payport address'
      }
    } catch (e) {
      return 'Invalid payport address'
    }
    return undefined
  }

  async getFeeRateRecommendation(level: AutoFeeLevels): Promise<FeeRate> {
    const gasPrice = await this.gasStation.getGasPrice(level)
    return {
      feeRate: gasPrice,
      feeRateType: FeeRateType.BasePerWeight,
    }
  }
}
