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
  buffToHex,
  hexToBuff,
  strip0x,
  prepend0x,
} from '@bitaccess/coinlib-common'
import { Logger, DelegateLogger, assertType, isNull, Numeric, isNumber } from '@bitaccess/ts-common'
import { BlockbookEthereum } from 'blockbook-client'
import InputDataDecoder from 'ethereum-input-data-decoder'
import Web3 from 'web3'
import Contract from 'web3-eth-contract'

import {
  PACKAGE_NAME,
  DEFAULT_ADDRESS_FORMAT,
  MIN_SWEEPABLE_WEI,
  TOKEN_METHODS_ABI,
  TOKEN_WALLET_ABI,
  TOKEN_WALLET_ABI_LEGACY,
  FULL_ERC20_TOKEN_METHODS_ABI,
  DEFAULT_MAINNET_CONSTANTS,
  DEFAULT_TESTNET_CONSTANTS,
  DEFAULT_DECIMALS,
} from './constants'
import {
  EthereumAddressFormat,
  EthereumAddressFormatT,
  EthereumPaymentsUtilsConfig,
  EthereumStandardizedTransaction,
  EthereumStandardizedReceipt,
  EthereumTransactionInfo,
  NetworkConstants,
} from './types'
import { isValidXprv, isValidXpub } from './bip44'
import { NetworkData } from './NetworkData'
import { retryIfDisconnected, deriveProxyCreate2Address } from './utils'
import { UnitConvertersUtil } from './UnitConvertersUtil'
import * as SIGNATURE from './erc20/constants'
import * as ethJsUtil from 'ethereumjs-util'
import {
  determinePathForIndex,
  deriveUniPubKeyForPath,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'

export class EthereumPaymentsUtils extends UnitConvertersUtil implements PaymentsUtils {
  readonly networkName: string
  readonly networkType: NetworkType
  readonly coinSymbol: string
  readonly coinName: string
  readonly coinDecimals: number
  readonly tokenAddress?: string
  readonly networkConstants: Required<NetworkConstants>
  readonly nativeCoinSymbol: string
  readonly nativeCoinName: string
  readonly nativeCoinDecimals: number

  logger: Logger
  web3: Web3
  eth: Web3['eth']
  networkData: NetworkData
  blockBookApi?: BlockbookEthereum

  constructor(config: EthereumPaymentsUtilsConfig) {
    super({
      coinDecimals: config.decimals,
      nativeDecimals: config.networkConstants?.nativeCoinDecimals ?? DEFAULT_DECIMALS
    })

    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.networkType = config.network || NetworkType.Mainnet
    this.networkConstants = {
      ...(this.networkType === NetworkType.Mainnet
        ? DEFAULT_MAINNET_CONSTANTS
        : DEFAULT_TESTNET_CONSTANTS),
      ...config.networkConstants,
    }
    this.networkName = this.networkConstants.networkName
    this.nativeCoinName = this.networkConstants.nativeCoinName
    this.nativeCoinSymbol = this.networkConstants.nativeCoinSymbol
    this.nativeCoinDecimals = this.networkConstants.nativeCoinDecimals

    if (config.tokenAddress) {
      // ERC20 case
      if (!config.name) {
        throw new Error(`Expected config.name to be provided for tokenAddress ${config.tokenAddress}`)
      }
      if (!config.symbol) {
        throw new Error(`Expected config.symbol to be provided for tokenAddress ${config.tokenAddress}`)
      }
      if (!config.decimals) {
        throw new Error(`Expected config.decimals to be provided for tokenAddress ${config.tokenAddress}`)
      }
    } else {
      // ether case
      if (config.name && config.name !== this.nativeCoinName) {
        throw new Error(`Unexpected config.name ${config.name} provided without config.tokenAddress`)
      }
      if (config.symbol && config.symbol !== this.nativeCoinSymbol) {
        throw new Error(`Unexpected config.symbol ${config.symbol} provided without config.tokenAddress`)
      }
      if (config.decimals && config.decimals !== this.nativeCoinDecimals) {
        throw new Error(`Unexpected config.decimals ${config.decimals} provided without config.tokenAddress`)
      }
    }

    this.coinName = config.name ?? this.nativeCoinName
    this.coinSymbol = config.symbol ?? this.nativeCoinSymbol
    this.coinDecimals = config.decimals ?? this.nativeCoinDecimals

    const networkNameEnv = this.networkConstants.networkName.toUpperCase().replace(/[- ]/, '_')
    const fullNode = config.fullNode
      ?? process.env[`${networkNameEnv}_FULL_NODE`] // ie ETHEREUM_MAINNET_FULL_NODE
    const blockbookNode = config.blockbookNode
      ?? process.env[`${networkNameEnv}_BLOCKBOOK_NODE`]?.split(',') // ie ETHEREUM_MAINNET_BLOCKBOOK_NODE
      ?? null

    this.networkData = new NetworkData({
      web3Config: {
        web3: config.web3,
        fullNode: fullNode,
        providerOptions: config.providerOptions,
      },
      logger: this.logger,
      blockBookConfig: {
        nodes: blockbookNode,
        api: config.blockbookApi,
        requestTimeoutMs: config.requestTimeoutMs,
      },
      gasStationUrl: config.gasStation,
      requestTimeoutMs: config.requestTimeoutMs,
    })

    this.web3 = this.networkData.web3Service.web3
    this.eth = this.web3.eth
    this.blockBookApi = this.networkData.blockBookService.api ?? undefined

    // standardize call depends on this.web3 so it must come last here
    this.tokenAddress = config.tokenAddress ? this.standardizeAddressOrThrow(config.tokenAddress) : undefined
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
    // Don't pass options into isValidAddress because it'll check if it matches the format
    // option, but we want to allow ANY valid address to be standardized by this method.
    if (!this.isValidAddress(address)) {
      return null
    }
    const format = assertType(EthereumAddressFormatT, options?.format ?? DEFAULT_ADDRESS_FORMAT, 'format')
    if (format === EthereumAddressFormat.Lowercase) {
      return prepend0x(address.toLowerCase())
    } else {
      return this.web3.utils.toChecksumAddress(address)
    }
  }

  standardizeAddressOrThrow(address: string, options?: { format?: string }): string {
    const standardized = this.standardizeAddress(address, options)
    if (standardized === null) {
      throw new Error(`Invalid ${this.networkName} address: ${address}`)
    }
    return standardized
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
    return isValidXprv(xprv)
  }

  isValidXpub(xpub: string): boolean {
    return isValidXpub(xpub)
  }

  isValidPrivateKey(prv: string): boolean {
    try {
      return ethJsUtil.isValidPrivate(hexToBuff(prv))
    } catch (e) {
      return false
    }
  }

  isValidPublicKey(pub: string): boolean {
    try {
      return ethJsUtil.isValidPublic(hexToBuff(pub), true)
    } catch (e) {
      return false
    }
  }

  isAddressEqual(address1: string, address2: string) {
    return strip0x(address1.toLowerCase()) === strip0x(address2.toLowerCase())
  }

  privateKeyToAddress(prv: string): string {
    return this.standardizeAddressOrThrow(buffToHex(ethJsUtil.privateToAddress(hexToBuff(prv))))
  }

  publicKeyToAddress(pub: string): string {
    return this.standardizeAddressOrThrow(buffToHex(ethJsUtil.publicToAddress(hexToBuff(pub), true)))
  }

  private _getPayportValidationMessage(payport: Payport): string | undefined {
    try {
      const { address } = payport
      if (!this.isValidAddress(address)) {
        return `Invalid ${this.networkName} payport address`
      }
    } catch (e) {
      return `Invalid ${this.networkName} payport address`
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
    return this.toBaseDenominationBigNumberNative(balanceEth).gt(MIN_SWEEPABLE_WEI)
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
    if (this.tokenAddress) {
      return this.getAddressBalanceERC20(address, this.tokenAddress)
    }
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
    return this.networkData.getNextNonce(address)
  }

  async getAddressUtxos() {
    return []
  }

  private getErc20TransferLogAmount(
    receipt: EthereumStandardizedReceipt,
    tokenDecimals: number,
    txHash: string,
  ): string {
    const txReceiptLogs = receipt.logs
    const transferLog = txReceiptLogs.find(log => log.topics[0] === SIGNATURE.LOG_TOPIC_ERC20_TRANSFER)
    if (!transferLog) {
      // this.logger.warn(`Cannot find ERC20 Transfer event log for ${txHash}, defaulting to 0`)
      return '0'
    }

    const unitConverter = this.getCustomUnitConverter(tokenDecimals)

    return unitConverter.toMainDenominationString(transferLog.data)
  }

  private checkErc20TransferLogAmount(
    receipt: EthereumStandardizedReceipt,
    tokenDecimals: number,
    txHash: string,
    inputAmount: string,
  ) {
    const actualAmount = this.getErc20TransferLogAmount(receipt, tokenDecimals, txHash)

    // Sometimes the transfer logs don't show up, so don't use the amount returned from this check
    // See https://ethereum.stackexchange.com/a/61967
    // If the transaction executed successfully, we can safely assume the amount in input data is
    // the actual amount transferred
    if (inputAmount !== actualAmount) {
      // this.logger.warn(
      //   `Transaction ${txHash} tried to transfer ${inputAmount} but ${actualAmount} was logged as transferred`,
      // )
    }
  }

  private getConfirmationStatus(tx: EthereumStandardizedTransaction) {
    let status: TransactionStatus = TransactionStatus.Pending
    let isExecuted = false

    const isConfirmed = tx.confirmations >= 1

    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      isExecuted = true
      if (!tx.status) {
        status = TransactionStatus.Failed
        isExecuted = false
      }
    }
    return { status, isExecuted, isConfirmed }
  }

  private async getTransactionInfoERC20(txId: string, tokenAddress: string): Promise<EthereumTransactionInfo> {
    const erc20Tx = await this.networkData.getERC20Transaction(txId, tokenAddress)

    let fromAddress = erc20Tx.from
    let toAddress = erc20Tx.to ?? tokenAddress
    const { txHash } = erc20Tx

    // USDT token has decimal place of 6, unlike other tokens that are 18 decimals;
    // so we have to use a custom unitConverter, the default one uses that 18 decimals
    const tokenDecimals = new BigNumber(erc20Tx.tokenDecimals ?? this.coinDecimals).toNumber()
    const customUnitConverter = this.getCustomUnitConverter(tokenDecimals)
    const { status, isExecuted, isConfirmed } = this.getConfirmationStatus(erc20Tx)

    const txInput = erc20Tx.txInput
    let amount: string
    let contractAddress: string | undefined

    const isERC20Transfer = txInput.startsWith(SIGNATURE.ERC20_TRANSFER)
    const isERC20SweepContractDeploy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY)
    const isERC20SweepContractDeployLegacy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY_LEGACY)
    const isERC20Proxy = txInput.startsWith(SIGNATURE.ERC20_PROXY)
    const isERC20Sweep = txInput.startsWith(SIGNATURE.ERC20_SWEEP)
    const isERC20SweepLegacy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_LEGACY)

    if (isERC20Transfer) {
      if (!this.isAddressEqual(toAddress, tokenAddress)) {
        // throw new Error(`Transaction ${txId} was sent to different contract: ${toAddress}, Expected: ${tokenAddress}`)
      }
      const inputDecoder = new InputDataDecoder(FULL_ERC20_TOKEN_METHODS_ABI)
      const txData = inputDecoder.decodeData(txInput)

      const expectedInputs = 2
      if (txData.inputs.length !== expectedInputs) {
        // throw new Error(`ERC20 transfer transaction ${txHash} has ${txData.inputs.length} but ${expectedInputs} were expected`)
      }

      toAddress = txData.inputs[0]
      amount = customUnitConverter.toMainDenominationString(txData.inputs[1].toString())

      if (isExecuted) {
        this.checkErc20TransferLogAmount(erc20Tx.receipt, tokenDecimals, txHash, amount)
      }
    } else if (isERC20SweepContractDeploy || isERC20SweepContractDeployLegacy || isERC20Proxy) {
      amount = '0'
      contractAddress = erc20Tx.contractAddress
    } else if (isERC20Sweep) {
      const inputDecoder = new InputDataDecoder(TOKEN_WALLET_ABI)
      const txData = inputDecoder.decodeData(txInput)

      const expectedInputs = 4
      if (txData.inputs.length !== expectedInputs) {
        // throw new Error(`ERC20 proxy sweep transaction ${txHash} has ${txData.inputs.length} but ${expectedInputs} were expected`)
      }
      // For ERC20 sweeps:
      // tx.from is the contract address
      // inputs[0] is salt
      // inputs[1] is the ERC20 contract address (this.tokenAddress)
      // inputs[2] is the recipient of the funds (toAddress)
      // inputs[3] is the amount
      const sweepContractAddress = toAddress
      if (!sweepContractAddress) {
        // throw new Error(`Transaction ${txHash} should have a to address destination`)
      }

      const proxyAddress = deriveProxyCreate2Address(sweepContractAddress, buffToHex(txData.inputs[0]))

      fromAddress = proxyAddress
      toAddress = txData.inputs[2]
      amount = customUnitConverter.toMainDenominationString(txData.inputs[3].toString())

      if (isExecuted) {
        this.checkErc20TransferLogAmount(erc20Tx.receipt, tokenDecimals, txHash, amount)
      }
    } else if (isERC20SweepLegacy) {
      const inputDecoder = new InputDataDecoder(TOKEN_WALLET_ABI_LEGACY)
      const txData = inputDecoder.decodeData(txInput)

      const expectedInputs = 2
      if (txData.inputs.length !== expectedInputs) {
        // throw new Error(`ERC20 legacy sweep transaction ${txHash} has ${txData.inputs.length} but ${expectedInputs} were expected`)
      }

      // For ERC20 legacy sweeps:
      // tx.to is the sweep contract address and source of funds (fromAddress)
      // tx.from is the contract owner address
      // inputs[0] is the ERC20 contract address (this.tokenAddress)
      // inputs[1] is the recipient of the funds (toAddress)
      const sweepContractAddress = toAddress
      if (!sweepContractAddress) {
        // throw new Error(`Transaction ${txHash} should have a to address destination`)
      }

      fromAddress = sweepContractAddress
      toAddress = txData.inputs[1]
      amount = this.getErc20TransferLogAmount(erc20Tx.receipt, tokenDecimals, txHash)
    } else {
      amount = ""
      // throw new Error('tx is neither ERC20 token transfer nor sweep')

    }

    const fee = this.toMainDenomination(new BigNumber(erc20Tx.gasPrice).multipliedBy(erc20Tx.gasUsed))

    const result: EthereumTransactionInfo = {
      id: txHash,
      amount,
      fromAddress: this.standardizeAddressOrThrow(fromAddress),
      toAddress: this.standardizeAddressOrThrow(toAddress),
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
      currentBlockNumber: erc20Tx.currentBlockNumber,
      data: erc20Tx,
    }
    // this.logger.debug('getTransactionInfoERC20', txId, tokenAddress, result)

    return result
  }

  async getTransactionInfo(txid: string): Promise<EthereumTransactionInfo> {
    if (this.tokenAddress) {
      return this.getTransactionInfoERC20(txid, this.tokenAddress)
    }
    const tx = await this.networkData.getTransaction(txid)

    const fee = this.toMainDenomination(new BigNumber(tx.gasPrice).multipliedBy(tx.gasUsed))
    const fromAddress = this.standardizeAddress(tx.from)
    const toAddress = this.standardizeAddress(tx.to ?? tx.contractAddress)
    const { status, isExecuted, isConfirmed } = this.getConfirmationStatus(tx)

    const result: EthereumTransactionInfo = {
      id: tx.txHash,
      amount: this.toMainDenomination(tx.value),
      fromAddress,
      toAddress,
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
      confirmationTimestamp: tx.blockTime,
      confirmationNumber: tx.blockHeight,
      status,
      currentBlockNumber: tx.currentBlockNumber,
      data: tx,
    }
    // this.logger.debug('getTransactionInfo', txid, result)

    return result
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    return this.networkData.getBlock(id ?? 'latest')
  }

  isSupportedAddressType(addressType: string): boolean {
    return isSupportedAddressType(addressType)
  }

  getSupportedAddressTypes(): string[] {
    return getSupportedAddressTypes()
  }

  determinePathForIndex(accountIndex: number, addressType?: any): string {
    const networkType: NetworkType = this.networkType
    const derivationPath: string = determinePathForIndex(accountIndex, addressType, networkType)
    return derivationPath
  }

  deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
    const uniPubKey: string = deriveUniPubKeyForPath(seed, derivationPath)
    return uniPubKey
  }
}
