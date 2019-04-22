import TronWeb, { Transaction as TronTransaction } from 'tronweb'
import { pick, get, cloneDeep } from 'lodash'
import { BalanceResult, PaymentsInterface, TransactionStatus } from 'payments-common'

import {
  TronTransactionInfo, TronUnsignedTransaction, TronSignedTransaction, TronBroadcastResult,
  CreateTransactionOptions, GetAddressOptions, BaseTronPaymentsConfig, TronWebTransaction,
} from './types'
import { toMainDenomination, toBaseDenomination, toBaseDenominationNumber, toError } from './utils'
import {
  TRX_FEE_FOR_TRANSFER_SUN,
  DEFAULT_FULL_NODE, DEFAULT_EVENT_SERVER, DEFAULT_SOLIDITY_NODE,
} from './constants'

export abstract class BaseTronPayments implements PaymentsInterface<
  TronUnsignedTransaction, TronSignedTransaction, TronBroadcastResult, TronTransactionInfo
> {
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

  async getBalance(addressOrIndex: string | number): Promise<BalanceResult> {
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
  ): Promise<TronUnsignedTransaction> {
    try {
      const {
        fromAddress, fromIndex, toAddress, toIndex
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
      return {
        id: tx.txID,
        from: fromAddress,
        to: toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeTrx,
        status: 'unsigned',
        rawUnsigned: tx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async createTransaction(
    from: string | number, to: string | number, amountTrx: string, options: CreateTransactionOptions = {}
  ): Promise<TronUnsignedTransaction> {
    try {
      const {
        fromAddress, fromIndex, toAddress, toIndex
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
      return {
        id: tx.txID,
        from: fromAddress,
        to: toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeTrx,
        status: 'unsigned',
        rawUnsigned: tx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async signTransaction(
    unsignedTx: TronUnsignedTransaction,
  ): Promise<TronSignedTransaction> {
    try {
      const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex)
      const unsignedRaw = cloneDeep(unsignedTx.rawUnsigned) as TronWebTransaction // tron modifies unsigned object
      const signedTx = await this.tronweb.trx.sign(unsignedRaw, fromPrivateKey)
      return {
        ...unsignedTx,
        status: 'signed',
        rawSigned: signedTx,
      }
    } catch(e) {
      throw toError(e)
    }
  }

  async broadcastTransaction(tx: TronSignedTransaction): Promise<TronBroadcastResult> {
    /*
     * I’ve discovered that tron nodes like to “remember” every transaction you give it.
     * If you try broadcasting an invalid TX the first time you’ll get a `SIGERROR` but
     * every subsequent broadcast gives a `DUP_TRANSACTION_ERROR`. Which is the exact same
     * error you get after rebroadcasting a valid transaction. And to make things worse,
     * if you try to look up the invalid transaction by ID it tells you `Transaction not found`.
     * So in order to actually determine the status of a broadcast the logic becomes:
     * `success status` -> broadcast succeeded
     * `error status` -> broadcast failed
     * `(DUP_TRANSACTION_ERROR && Transaction found)` -> tx already broadcast
     * `(DUP_TRANASCTION_ERROR && Transaction not found)` -> tx was probably invalid? Maybe? Who knows…
     */
    try {
      const status = await this.tronweb.trx.sendRawTransaction(tx.rawSigned as TronWebTransaction)
      let success = false
      let rebroadcast = false
      if (status.result || status.code === 'SUCCESS') {
        success = true
      } else {
        try {
          await this.tronweb.trx.getTransaction(tx.id)
          success = true
          rebroadcast = true
        } catch (e) {}
      }
      if (success) {
        return {
          id: tx.id,
          rebroadcast,
        }
      } else {
        let statusCode: string | undefined = status.code
        if (status.code === 'DUP_TRANSACTION_ERROR') {
          statusCode = 'DUP_TX_BUT_TX_NOT_FOUND_SO_PROBABLY_INVALID_TX_ERROR'
        }
        throw new Error(`Failed to broadcast transaction: ${status.code}`)
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async getTransactionInfo(txid: string): Promise<TronTransactionInfo> {
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
      const isExecuted = contractRet === 'SUCCESS'

      const block = txInfo.blockNumber
      const feeTrx = toMainDenomination(txInfo.fee || 0)

      const currentBlockNumber = get(currentBlock, 'block_header.raw_data.number', 0)
      const confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0
      const isConfirmed = confirmations > 0

      const date = new Date(tx.raw_data.timestamp)

      let status: TransactionStatus = TransactionStatus.Pending
      if (isConfirmed) {
        if (!isExecuted) {
          status = TransactionStatus.Failed
        }
        status = TransactionStatus.Confirmed
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
        isExecuted,
        isConfirmed,
        confirmations,
        date,
        status,
        rawInfo: {
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

  async resolveAddress(addressOrIndex: string | number): Promise<string> {
    if (typeof addressOrIndex === 'number') {
      return this.getAddress(addressOrIndex)
    } else {
      if (!this.isValidAddress(addressOrIndex)) {
        throw new Error(`Invalid TRON address: ${addressOrIndex}`)
      }
      return addressOrIndex
    }
  }

  async resolveFromTo(from: string | number, to: string | number): Promise<{
    fromIndex: number, fromAddress: string,
    toIndex: number | null, toAddress: string,
  }> {
    const fromIndex = typeof from === 'string'
      ? await this.getAddressIndex(from)
      : from
    return {
      fromAddress: await this.resolveAddress(from),
      fromIndex,
      toAddress: await this.resolveAddress(to),
      toIndex: typeof to === 'string'
        ? await this.getAddressIndexOrNull(to)
        : to,
    }
  }
}

export default BaseTronPayments
