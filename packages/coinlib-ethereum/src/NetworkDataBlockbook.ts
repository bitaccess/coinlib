import { BlockInfo, TransactionStatus } from '@bitaccess/coinlib-common'
import { Logger } from '@faast/ts-common'
import InputDataDecoder from 'ethereum-input-data-decoder'
import { BlockbookEthereum, GetAddressDetailsOptions, NormalizedTxEthereum, SpecificTxEthereum } from 'blockbook-client'
import Web3 from 'web3'

import {
  ETH_DECIMAL_PLACES,
  MIN_CONFIRMATIONS,
  TOKEN_METHODS_ABI,
  TOKEN_WALLET_ABI,
  TOKEN_WALLET_ABI_LEGACY,
} from './constants'

import { EthereumBlockbookConnectedConfig, EthereumTransactionInfo, EthereumNetworkDataProvider } from './types'
import { UnitConvertersUtil } from './UnitConvertersUtil'
import { retryIfDisconnected, resolveServer } from './utils'

import * as SIGNATURE from './erc20/constants'
import { deriveAddress } from './erc20/deriveAddress'

export class NetworkDataBlockbook extends UnitConvertersUtil implements EthereumNetworkDataProvider {
  private logger: Logger
  private api: BlockbookEthereum

  constructor(config: EthereumBlockbookConnectedConfig) {
    super({ coinDecimals: config.decimals })
    this.logger = config.logger
    const { api } = resolveServer(config, this.logger)

    this.api = api
  }

  async init(): Promise<void> {
    await this.api.connect()
  }

  async destroy(): Promise<void> {
    await this.api.disconnect()
  }

  async getBlock(id?: string | number): Promise<BlockInfo> {
    const blockId = id ?? (await this.getCurrentBlockNumber())

    const raw = await this._retryDced(() => this.api.getBlock(blockId))

    const blockInfo: BlockInfo = {
      height: raw.height,
      id: raw.hash,
      previousId: raw.previousBlockHash,
      time: new Date(Number(raw.time) * 1000),
      raw,
    }

    return blockInfo
  }

  async getCurrentBlockNumber() {
    const bestBlock = await this._retryDced(() => this.api.getBestBlock())

    return bestBlock.height
  }

  async getTransaction(txId: string): Promise<NormalizedTxEthereum> {
    return this._retryDced(() => this.api.getTx(txId))
  }

  async getAddressDetails(address: string, options?: GetAddressDetailsOptions) {
    return this._retryDced(() => this.api.getAddressDetails(address, options))
  }

  private getErc20TransferLogAmount(txSpecific: SpecificTxEthereum, tokenDecimals: number): string {
    const txReceiptLogs = txSpecific.receipt.logs
    const transferLog = txReceiptLogs.find(log => log.topics[0] === SIGNATURE.LOG_TOPIC0_ERC20_SWEEP)
    if (!transferLog) {
      this.logger.warn(`Transaction ${txSpecific.tx.hash} was an ERC20 sweep but cannot find log for Transfer event`)
      return '0'
    }

    const useCustomUnitConverter = tokenDecimals !== ETH_DECIMAL_PLACES
    const customUnitConverter = this.getCustomUnitConverter(tokenDecimals)

    return useCustomUnitConverter
      ? customUnitConverter.toMainDenominationString(transferLog.data)
      : this.toMainDenomination(transferLog.data)
  }

  async getTransactionInfoERC20(txId: string, tokenAddress?: string) {
    const tx = await this.getTransaction(txId)

    let fromAddress = tx.vin[0].addresses[0].toLowerCase()
    const outputAddresses = tx.vout[0].addresses
    let toAddress = outputAddresses ? outputAddresses[0].toLowerCase() : null
    let amount = ''

    const txSpecific: SpecificTxEthereum = await this._retryDced(() => this.api.getTxSpecific(txId))
    const tokenTransfers: NormalizedTxEthereum['tokenTransfers'] = tx.tokenTransfers ?? []

    if (tokenTransfers.length < 1) {
      throw new Error(`txId=${tx.txid} has no tokenTransfers`)
    }

    let erc20TokenAddress: string | undefined
    let tokenDecimals = ETH_DECIMAL_PLACES
    let tokenSymbol = ''

    // we can only handle single token transfers/sweeps for now!
    if (tokenAddress) {
      const transferredToken = tokenTransfers.find(
        transfer => transfer.token.toLowerCase() === tokenAddress.toLowerCase(),
      )

      if (!transferredToken) {
        throw new Error(`tx tokenTransfer does not contain token=${tokenAddress}`)
      }

      tokenDecimals = transferredToken.decimals
      erc20TokenAddress = transferredToken.token
      tokenSymbol = transferredToken.symbol
    } else {
      // we just pick the first one
      erc20TokenAddress = tokenTransfers[0].token
      tokenSymbol = tokenTransfers[0].symbol
    }

    const currentBlockNumber = await this.getCurrentBlockNumber()

    let status: TransactionStatus = TransactionStatus.Pending
    let isExecuted = false

    // XXX it is suggested to keep 12 confirmations
    // https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
    const isConfirmed = tx.confirmations > Math.max(MIN_CONFIRMATIONS, 12)

    if (isConfirmed) {
      status = TransactionStatus.Confirmed
      isExecuted = true
    }

    const tokenDecoder = new InputDataDecoder(TOKEN_METHODS_ABI)
    const txInput = txSpecific.tx.input

    const isERC20Transfer = txInput.startsWith(SIGNATURE.ERC20_TRANSFER)
    const isERC20SweepContractDeploy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY)
    const isERC20SweepContractDeployLegacy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_CONTRACT_DEPLOY_LEGACY)
    const isERC20Proxy = txInput.startsWith(SIGNATURE.ERC20_PROXY)
    const isERC20Sweep = txInput.startsWith(SIGNATURE.ERC20_SWEEP)
    const isERC20SweepLegacy = txInput.startsWith(SIGNATURE.ERC20_SWEEP_LEGACY)

    const web3 = new Web3()

    if (isERC20Transfer) {
      if (toAddress !== erc20TokenAddress.toLowerCase()) {
        throw new Error(
          `Transaction ${txId} was sent to different contract: ${toAddress}, Expected: ${erc20TokenAddress}`,
        )
      }
      const txData = tokenDecoder.decodeData(txInput)

      toAddress = txData.inputs[0]
      // USDT token has decimal place of 6, unlike other tokens that are 18 decimals;
      // so we have to use a custom unitConverter, the default one uses that 18 decimals
      const useCustomUnitConverter = tokenDecimals !== ETH_DECIMAL_PLACES
      const customUnitConverter = this.getCustomUnitConverter(tokenDecimals)

      const inputAmount = txData.inputs[1].toString()

      amount = useCustomUnitConverter
        ? customUnitConverter.toMainDenominationString(inputAmount)
        : this.toMainDenomination(inputAmount)

      const actualAmount = this.getErc20TransferLogAmount(txSpecific, tokenDecimals)

      if (isExecuted && amount !== actualAmount) {
        this.logger.warn(
          `Transaction ${tx.txid} tried to transfer ${amount} but only ${actualAmount} was actually transferred`,
        )
      }
    } else if (isERC20SweepContractDeploy || isERC20SweepContractDeployLegacy || isERC20Proxy) {
      amount = '0'
    } else if (isERC20Sweep) {
      const tokenDecoder = new InputDataDecoder(TOKEN_WALLET_ABI)
      const txData = tokenDecoder.decodeData(txInput)

      if (txData.inputs.length !== 4) {
        throw new Error(`Transaction ${tx.txid} has not recognized number of inputs ${txData.inputs.length}`)
      }
      // For ERC20 sweeps:
      // tx.from is the contract address
      // inputs[0] is salt
      // inputs[1] is the ERC20 contract address (this.tokenAddress)
      // inputs[2] is the recipient of the funds (toAddress)
      // inputs[3] is the amount
      const sweepContractAddress = toAddress
      if (!sweepContractAddress) {
        throw new Error(`Transaction ${tx.txid} should have a to address destination`)
      }

      const addr = deriveAddress(sweepContractAddress, `0x${txData.inputs[0].toString('hex')}`, true)

      fromAddress = web3.utils.toChecksumAddress(addr).toLowerCase()
      toAddress = web3.utils.toChecksumAddress(txData.inputs[2]).toLowerCase()
      amount = this.getErc20TransferLogAmount(txSpecific, tokenDecimals)
    } else if (isERC20SweepLegacy) {
      const tokenDecoder = new InputDataDecoder(TOKEN_WALLET_ABI_LEGACY)
      const txData = tokenDecoder.decodeData(txInput)

      if (txData.inputs.length !== 2) {
        throw new Error(`Transaction ${tx.txid} has not recognized number of inputs ${txData.inputs.length}`)
      }
      // For ERC20 legacy sweeps:
      // tx.to is the sweep contract address and source of funds (fromAddress)
      // tx.from is the contract owner address
      // inputs[0] is the ERC20 contract address (this.tokenAddress)
      // inputs[1] is the recipient of the funds (toAddress)
      const sweepContractAddress = toAddress
      if (!sweepContractAddress) {
        throw new Error(`Transaction ${tx.txid} should have a to address destination`)
      }

      fromAddress = web3.utils.toChecksumAddress(sweepContractAddress).toLowerCase()
      toAddress = web3.utils.toChecksumAddress(txData.inputs[1]).toLowerCase()

      amount = this.getErc20TransferLogAmount(txSpecific, tokenDecimals)
    } else {
      throw new Error('tx is neither ERC20 token transfer nor sweep')
    }

    const result: EthereumTransactionInfo = {
      id: tx.txid,
      amount,
      fromAddress,
      toAddress,
      fromExtraId: null,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee: this.toMainDenomination(tx.fees),
      sequenceNumber: tx.ethereumSpecific.nonce,
      weight: tx.ethereumSpecific.gasUsed,
      isExecuted,
      isConfirmed,
      confirmations: tx.confirmations,
      confirmationId: tx.blockHash ?? null,
      confirmationTimestamp: new Date(Number(tx.blockTime) * 1000),
      confirmationNumber: tx.blockHeight,
      status,
      currentBlockNumber,
      data: {
        ...tx,
        ...txSpecific.receipt,
        currentBlock: currentBlockNumber,
        symbol: tokenSymbol,
      },
    }

    return result
  }

  async _retryDced<T>(fn: () => Promise<T>, additionalRetryableErrors?: string[]): Promise<T> {
    return retryIfDisconnected(fn, this.logger, additionalRetryableErrors)
  }
}
