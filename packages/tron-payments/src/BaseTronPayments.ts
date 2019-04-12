import TronWeb, { Transaction as TronTransaction } from 'tronweb'
import { pick, get } from 'lodash'
import { Balance, PaymentsInterface, TransactionStatus, BroadcastResult } from 'payments-common'

import { TransactionInfo, SignedTransaction, CreateTransactionOptions, GetAddressOptions } from './types'
import { toMainDenomination, toBaseDenomination, toBaseDenominationNumber, toError } from './utils'
import {
  TRX_FEE_FOR_TRANSFER_SUN,
  DEFAULT_FULL_NODE, DEFAULT_EVENT_SERVER, DEFAULT_SOLIDITY_NODE, BROADCAST_SUCCESS_CODES,
} from './constants'

export interface BaseTronPaymentsConfig {
  fullNode?: string
  solidityNode?: string
  eventServer?: string
}

export abstract class BaseTronPayments implements PaymentsInterface<TransactionInfo, SignedTransaction> {
  // You may notice that many function blocks are enclosed in a try/catch.
  // I had to do this because tronweb thinks it's a good idea to throw
  // strings instead of Errors and now we need to convert them all ourselves
  // to be consistent.

  fullNode: string
  solidityNode: string
  eventServer: string
  tronweb: TronWeb

  constructor(config: BaseTronPaymentsConfig) {
    this.fullNode = config.fullNode || DEFAULT_FULL_NODE
    this.solidityNode = config.solidityNode || DEFAULT_SOLIDITY_NODE
    this.eventServer = config.eventServer || DEFAULT_EVENT_SERVER

    this.tronweb = new TronWeb(
      this.fullNode,
      this.solidityNode,
      this.eventServer
    )
  }

  static toMainDenomination = toMainDenomination
  static toBaseDenomination = toBaseDenomination
  toMainDenomination = toMainDenomination
  toBaseDenomination = toBaseDenomination

  isValidAddress(address: string): boolean {
    return this.tronweb.isAddress(address)
  }

  isValidPrivateKey(privateKey: string): boolean {
    try {
      this.privateKeyToAddress(privateKey)
      return true
    } catch(e) {
      return false
    }
  }

  privateKeyToAddress(privateKey: string): string {
    const address = this.tronweb.address.fromPrivateKey(privateKey)
    if (this.isValidAddress(address)) {
      return address
    } else {
      throw new Error('Validation failed for address derived from private key')
    }
  }

  abstract async getAddress(index: number, options?: GetAddressOptions): Promise<string>
  abstract async getAddressIndex(address: string): Promise<number>
  abstract async getPrivateKey(index: number): Promise<string>

  async getAddressOrNull(index: number, options?: GetAddressOptions): Promise<string | null> {
    try {
      return await this.getAddress(index, options)
    } catch(e) {
      return null
    }
  }

  async getAddressIndexOrNull(address: string): Promise<number | null> {
    try {
      return await this.getAddressIndex(address)
    } catch(e) {
      return null
    }
  }

  async getBalance(addressOrIndex: string | number): Promise<Balance> {
    try {
      const address = await this.resolveAddress(addressOrIndex)
      const balanceSun = await this.tronweb.trx.getBalance(address)
      return {
        balance: toMainDenomination(balanceSun).toString(),
        unconfirmedBalance: '0',
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async canSweep(addressOrIndex: string | number): Promise<boolean> {
    const { balance } = await this.getBalance(addressOrIndex)
    return this.canSweepBalance(toBaseDenominationNumber(balance))
  }

  async createSweepTransaction(
    from: string | number, to: string | number, options: CreateTransactionOptions = {}
  ): Promise<SignedTransaction> {
    try {
      const {
        fromAddress, fromIndex, fromPrivateKey, toAddress, toIndex
      } = await this.resolveFromTo(from, to)
      const feeSun = options.fee || TRX_FEE_FOR_TRANSFER_SUN
      const feeTrx = toMainDenomination(feeSun)
      const balanceSun = await this.tronweb.trx.getBalance(fromAddress)
      const balanceTrx = toMainDenomination(balanceSun)
      if (!this.canSweepBalance(balanceSun)) {
        throw new Error(`Insufficient balance (${balanceTrx}) to sweep with fee of ${feeTrx}`)
      }
      const amountSun = balanceSun - feeSun
      const amountTrx = toMainDenomination(amountSun)
      const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)
      const signedTx = await this.tronweb.trx.sign(tx, fromPrivateKey)
      return {
        id: signedTx.txID,
        from: fromAddress,
        to: toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeTrx,
        status: 'pending',
        raw: signedTx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async createTransaction(
    from: string | number, to: string | number, amountTrx: string, options: CreateTransactionOptions = {}
  ): Promise<SignedTransaction> {
    try {
      const {
        fromAddress, fromIndex, fromPrivateKey, toAddress, toIndex
      } = await this.resolveFromTo(from, to)
      const feeSun = options.fee || TRX_FEE_FOR_TRANSFER_SUN
      const feeTrx = toMainDenomination(feeSun)
      const balanceSun = await this.tronweb.trx.getBalance(fromAddress)
      const balanceTrx = toMainDenomination(balanceSun)
      const amountSun = toBaseDenominationNumber(amountTrx)
      if ((balanceSun - feeSun) < amountSun) {
        throw new Error(`Insufficient balance (${balanceTrx}) to send including fee of ${feeTrx}`)
      }
      const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)
      const signedTx = await this.tronweb.trx.sign(tx, fromPrivateKey)
      return {
        id: signedTx.txID,
        from: fromAddress,
        to: toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeTrx,
        status: 'pending',
        raw: signedTx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async broadcastTransaction(tx: SignedTransaction): Promise<BroadcastResult> {
    try {
      const status = await this.tronweb.trx.sendRawTransaction(tx.raw || tx)
      if (status.result || status.code && BROADCAST_SUCCESS_CODES.includes(status.code)) {
        return {
          id: tx.id,
        }
      }
      throw new Error(`Failed to broadcast transaction: ${status.code}`)
    } catch (e) {
      throw toError(e)
    }
  }

  async getTransactionInfo(txid: string): Promise<TransactionInfo> {
    try {
      const [tx, txInfo, currentBlock] = await Promise.all([
        this.tronweb.trx.getTransaction(txid),
        this.tronweb.trx.getTransactionInfo(txid),
        this.tronweb.trx.getCurrentBlock(),
      ])

      const { amountTrx, from, to } = this.extractTxFields(tx)

      const [fromIndex, toIndex] = await Promise.all([
        this.getAddressIndexOrNull(from),
        this.getAddressIndexOrNull(to),
      ])

      const contractRet = get(tx, 'ret[0].contractRet')
      const executed = contractRet === 'SUCCESS'

      const block = txInfo.blockNumber
      const feeTrx = toMainDenomination(txInfo.fee || 0)

      const currentBlockNumber = get(currentBlock, 'block_header.raw_data.number', 0)
      const confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0
      const confirmed = confirmations > 0

      const date = new Date(tx.raw_data.timestamp)

      let status: TransactionStatus = 'pending'
      if (confirmed) {
        if (!executed) {
          status = 'failed'
        }
        status = 'confirmed'
      }

      return {
        id: tx.txID,
        amount: amountTrx,
        to,
        from,
        toExtraId: null,
        fromIndex,
        toIndex,
        block,
        fee: feeTrx,
        executed,
        confirmed,
        confirmations,
        date,
        status,
        raw: {
          ...tx,
          ...txInfo,
          currentBlock: pick(currentBlock, 'block_header', 'blockID'),
        }
      }
    } catch (e) {
      throw toError(e)
    }
  }

  // HELPERS

  private canSweepBalance(balanceSun: number): boolean {
    return (balanceSun - TRX_FEE_FOR_TRANSFER_SUN) > 0
  }

  private extractTxFields(tx: TronTransaction) {
    const contractParam = get(tx, 'raw_data.contract[0].parameter.value')
    if (!(contractParam && typeof contractParam.amount === 'number')) {
      throw new Error('Unable to get transaction')
    }

    const amountSun = contractParam.amount || 0
    const amountTrx = toMainDenomination(amountSun)
    const to = this.tronweb.address.fromHex(contractParam.to_address)
    const from = this.tronweb.address.fromHex(contractParam.owner_address)
    return {
      amountTrx,
      amountSun,
      to,
      from,
    }
  }

  private async resolveAddress(addressOrIndex: string | number): Promise<string> {
    if (typeof addressOrIndex === 'number') {
      return this.getAddress(addressOrIndex)
    } else {
      if (!this.isValidAddress(addressOrIndex)) {
        throw new Error(`Invalid TRON address: ${addressOrIndex}`)
      }
      return addressOrIndex
    }
  }

  private async resolveFromTo(from: string | number, to: string | number): Promise<{
    fromIndex: number, fromAddress: string, fromPrivateKey: string,
    toIndex: number | null, toAddress: string,
  }> {
    const fromIndex = typeof from === 'string'
      ? await this.getAddressIndex(from)
      : from
    return {
      fromAddress: await this.resolveAddress(from),
      fromIndex,
      fromPrivateKey: await this.getPrivateKey(fromIndex),
      toAddress: await this.resolveAddress(to),
      toIndex: typeof to === 'string'
        ? await this.getAddressIndexOrNull(to)
        : to,
    }
  }
}

export default BaseTronPayments
