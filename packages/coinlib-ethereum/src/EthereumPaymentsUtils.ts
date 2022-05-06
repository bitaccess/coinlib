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
} from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, assertType, isNull, Numeric, isNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { BlockbookEthereum } from 'blockbook-client'
import InputDataDecoder from 'ethereum-input-data-decoder'
import Web3 from 'web3'
import Contract from 'web3-eth-contract'

import {
  PACKAGE_NAME,
  ETH_DECIMAL_PLACES,
  ETH_NAME,
  ETH_SYMBOL,
  DEFAULT_ADDRESS_FORMAT,
  MIN_SWEEPABLE_WEI,
  TOKEN_METHODS_ABI,
  TOKEN_WALLET_ABI,
  TOKEN_WALLET_ABI_LEGACY,
  FULL_ERC20_TOKEN_METHODS_ABI,
  MIN_CONFIRMATIONS,
} from './constants'
import {
  EthereumAddressFormat,
  EthereumAddressFormatT,
  EthereumPaymentsUtilsConfig,
  EthereumStandardizedERC20Transaction,
  EthereumTransactionInfo,
} from './types'
import { isValidXkey } from './bip44'
import { NetworkData } from './NetworkData'
import { retryIfDisconnected } from './utils'
import { UnitConvertersUtil } from './UnitConvertersUtil'
import * as SIGNATURE from './erc20/constants'
import { deriveAddress } from './erc20/deriveAddress'

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
  blockBookApi: BlockbookEthereum

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

    if (config.blockbookApi) {
      this.blockBookApi = config.blockbookApi
    } else if (config.blockbookNode) {
      const blockBookApi = new BlockbookEthereum({
        nodes: [config.blockbookNode],
        logger: this.logger,
      })

      this.blockBookApi = blockBookApi
    } else {
      throw new Error(`Blockbook node is missing from config`)
    }

    this.eth = this.web3.eth

    this.networkData = new NetworkData({
      web3Config: {
        web3: this.web3,
        fullNode: config.fullNode,
        decimals: config.decimals,
        providerOptions: config.providerOptions,
      },
      parityUrl: config.parityNode,
      logger: this.logger,
      blockBookConfig: {
        nodes: this.server,
        api: this.blockBookApi,
      },
      gasStationUrl: config.gasStation,
    })
  }

  protected newContract(...args: ConstructorParameters<typeof Contract>) {
    const contract = new Contract(...args)
    contract.setProvider(this.eth.currentProvider)
    return contract
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

  formatAddress(address: string) {
    if (address.startsWith('0x')) {
      return address
    }

    return `0x${address}`
  }

  isAddressBalanceSweepable(balanceEth: Numeric): boolean {
    return this.toBaseDenominationBigNumberEth(balanceEth).gt(MIN_SWEEPABLE_WEI)
  }

  async getAddressBalanceERC20(address: string, tokenAddress: string): Promise<BalanceResult> {
    const balance = await this.networkData.getAddressBalanceERC20(address, tokenAddress)

    const sweepable = this.toMainDenominationBigNumber(balance).gt(0)

    return {
      confirmedBalance: this.toMainDenomination(balance),
      unconfirmedBalance: '0',
      spendableBalance: this.toMainDenomination(balance),
      sweepable,
      requiresActivation: false,
    }
  }

  async getAddressBalance(address: string): Promise<BalanceResult> {
    const balance = await this.networkData.getAddressBalance(address)
    const confirmedBalance = this.toMainDenomination(balance).toString()
    const sweepable = this.isAddressBalanceSweepable(confirmedBalance)

    return {
      confirmedBalance,
      unconfirmedBalance: '0',
      spendableBalance: confirmedBalance,
      sweepable,
      requiresActivation: false,
    }
  }

  async getAddressNextSequenceNumber(address: string) {
    return this.networkData.getNonce(address)
  }

  async getAddressUtxos() {
    return []
  }

  private getErc20TransferLogAmount(
    receipt: EthereumStandardizedERC20Transaction['receipt'],
    tokenDecimals: number,
    txHash: string,
  ): string {
    const txReceiptLogs = receipt.logs
    const transferLog = txReceiptLogs.find(log => log.topics[0] === SIGNATURE.LOG_TOPIC0_ERC20_SWEEP)
    if (!transferLog) {
      this.logger.warn(`Transaction ${txHash} was an ERC20 sweep but cannot find log for Transfer event`)
      return '0'
    }

    const unitConverter = this.getCustomUnitConverter(tokenDecimals)

    return unitConverter.toMainDenominationString(transferLog.data)
  }

  private async getTransactionInfoERC20(txId: string, tokenAddress: string): Promise<EthereumTransactionInfo> {
    const erc20Tx = await this.networkData.getERC20Transaction(txId, tokenAddress)

    let fromAddress = erc20Tx.from
    let toAddress = erc20Tx.to
    const tokenDecimals = new BigNumber(erc20Tx.tokenDecimals).toNumber()
    const { txHash } = erc20Tx

    let status: TransactionStatus = TransactionStatus.Pending
    let isExecuted = false

    // XXX it is suggested to keep 12 confirmations
    // https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
    const isConfirmed = erc20Tx.confirmations > Math.max(MIN_CONFIRMATIONS, 12)

    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      isExecuted = true
    }

    const tokenDecoder = new InputDataDecoder(FULL_ERC20_TOKEN_METHODS_ABI)
    const txInput = erc20Tx.txInput
    let amount = ''

    const isERC20Transfer = txInput.startsWith(SIGNATURE.ERC20_TRANSFER)
    const isERC20SweepContractDeploy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY)
    const isERC20SweepContractDeployLegacy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY_LEGACY)
    const isERC20Proxy = txInput.startsWith(SIGNATURE.ERC20_PROXY)
    const isERC20Sweep = txInput.startsWith(SIGNATURE.ERC20_SWEEP)
    const isERC20SweepLegacy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_LEGACY)

    if (isERC20Transfer) {
      if (toAddress.toLowerCase() !== tokenAddress.toLowerCase()) {
        throw new Error(`Transaction ${txId} was sent to different contract: ${toAddress}, Expected: ${tokenAddress}`)
      }
      const txData = tokenDecoder.decodeData(txInput)

      toAddress = txData.inputs[0]

      // USDT token has decimal place of 6, unlike other tokens that are 18 decimals;
      // so we have to use a custom unitConverter, the default one uses that 18 decimals
      const customUnitConverter = this.getCustomUnitConverter(tokenDecimals)

      const inputAmount = txData.inputs[1].toString()

      amount = customUnitConverter.toMainDenominationString(inputAmount)

      const actualAmount = this.getErc20TransferLogAmount(erc20Tx.receipt, tokenDecimals, txHash)

      if (isExecuted && amount !== actualAmount) {
        this.logger.warn(
          `Transaction ${txHash} tried to transfer ${amount} but only ${actualAmount} was actually transferred`,
        )
      }
    } else if (isERC20SweepContractDeploy || isERC20SweepContractDeployLegacy || isERC20Proxy) {
      amount = '0'
    } else if (isERC20Sweep) {
      const tokenDecoder = new InputDataDecoder(TOKEN_WALLET_ABI)
      const txData = tokenDecoder.decodeData(txInput)

      if (txData.inputs.length !== 4) {
        throw new Error(`Transaction ${txHash} has not recognized number of inputs ${txData.inputs.length}`)
      }
      // For ERC20 sweeps:
      // tx.from is the contract address
      // inputs[0] is salt
      // inputs[1] is the ERC20 contract address (this.tokenAddress)
      // inputs[2] is the recipient of the funds (toAddress)
      // inputs[3] is the amount
      const sweepContractAddress = toAddress
      if (!sweepContractAddress) {
        throw new Error(`Transaction ${txHash} should have a to address destination`)
      }

      const addr = deriveAddress(sweepContractAddress, `0x${txData.inputs[0].toString('hex')}`, true)

      fromAddress = this.web3.utils.toChecksumAddress(addr).toLowerCase()
      toAddress = this.web3.utils.toChecksumAddress(txData.inputs[2]).toLowerCase()
      amount = this.getErc20TransferLogAmount(erc20Tx.receipt, tokenDecimals, txHash)
    } else if (isERC20SweepLegacy) {
      const tokenDecoder = new InputDataDecoder(TOKEN_WALLET_ABI_LEGACY)
      const txData = tokenDecoder.decodeData(txInput)

      if (txData.inputs.length !== 2) {
        throw new Error(`Transaction ${txHash} has not recognized number of inputs ${txData.inputs.length}`)
      }
      // For ERC20 legacy sweeps:
      // tx.to is the sweep contract address and source of funds (fromAddress)
      // tx.from is the contract owner address
      // inputs[0] is the ERC20 contract address (this.tokenAddress)
      // inputs[1] is the recipient of the funds (toAddress)
      const sweepContractAddress = toAddress
      if (!sweepContractAddress) {
        throw new Error(`Transaction ${txHash} should have a to address destination`)
      }

      fromAddress = this.web3.utils.toChecksumAddress(sweepContractAddress).toLowerCase()
      toAddress = this.web3.utils.toChecksumAddress(txData.inputs[1]).toLowerCase()

      amount = this.getErc20TransferLogAmount(erc20Tx.receipt, tokenDecimals, txHash)
    } else {
      throw new Error('tx is neither ERC20 token transfer nor sweep')
    }

    const fee = this.toMainDenomination(new BigNumber(erc20Tx.gasPrice).multipliedBy(erc20Tx.gasUsed))

    const currentBlockNumber = await this.getCurrentBlockNumber()

    const result: EthereumTransactionInfo = {
      id: txHash,
      amount,
      fromAddress: this.formatAddress(fromAddress),
      toAddress: this.formatAddress(toAddress),
      fromExtraId: null,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee,
      sequenceNumber: erc20Tx.nonce,
      weight: erc20Tx.gasUsed,
      isExecuted,
      isConfirmed,
      confirmations: erc20Tx.confirmations,
      confirmationId: erc20Tx.blockHash,
      confirmationTimestamp: erc20Tx.blockTime,
      confirmationNumber: erc20Tx.blockHeight,
      status,
      currentBlockNumber,
      data: {
        ...erc20Tx,
      },
    }

    return result
  }

  async getTransactionInfo(txid: string): Promise<EthereumTransactionInfo> {
    if (this.tokenAddress) {
      return this.getTransactionInfoERC20(txid, this.tokenAddress)
    }
    const tx = await this.networkData.getTransaction(txid)

    let status: TransactionStatus = TransactionStatus.Pending
    let isExecuted = false

    // XXX it is suggested to keep 12 confirmations
    // https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
    const isConfirmed = tx.confirmations > Math.max(MIN_CONFIRMATIONS, 12)

    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      isExecuted = true
    }

    const currentBlockNumber = await this.getCurrentBlockNumber()

    const fee = this.toMainDenomination(new BigNumber(tx.gasPrice).multipliedBy(tx.gasUsed))

    const result: EthereumTransactionInfo = {
      id: tx.txHash,
      amount: this.toMainDenomination(tx.value),
      fromAddress: this.formatAddress(tx.from),
      toAddress: this.formatAddress(tx.to),
      fromExtraId: null,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee,
      sequenceNumber: tx.nonce,
      weight: tx.gasUsed,
      isExecuted,
      isConfirmed,
      confirmations: tx.confirmations,
      confirmationId: tx.blockHash ?? null,
      confirmationTimestamp: new Date(Number(tx.blockTime) * 1000),
      confirmationNumber: tx.blockHeight,
      status,
      currentBlockNumber,
      data: {
        ...tx.raw,
      },
    }

    return result
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    return this.networkData.getBlock(id ?? 'latest')
  }
}
