import { BaseLitecoinPayments } from './BaseLitecoinPayments'
import {
  MultisigLitecoinPaymentsConfig,
  HdLitecoinPaymentsConfig,
  LitecoinUnsignedTransaction,
  LitecoinSignedTransaction,
  MultisigAddressType,
} from './types'
import {
  PayportOutput
} from '@faast/bitcoin-payments'
import { omit } from 'lodash'
import { HdLitecoinPayments } from './HdLitecoinPayments'
import { KeyPairLitecoinPayments } from './KeyPairLitecoinPayments'
import * as bitcoin from 'bitcoinjs-lib'
import { CreateTransactionOptions, ResolveablePayport, BaseMultisigData } from '@faast/payments-common'
import { publicKeyToString, getMultisigPaymentScript } from './helpers'
import { Numeric } from '@faast/ts-common'
import { DEFAULT_MULTISIG_ADDRESS_TYPE } from './constants'

export class MultisigLitecoinPayments extends BaseLitecoinPayments<MultisigLitecoinPaymentsConfig> {

  addressType: MultisigAddressType
  m: number
  signers: (HdLitecoinPayments | KeyPairLitecoinPayments)[]
  accountIdToSigner: { [accountId: string]: HdLitecoinPayments | KeyPairLitecoinPayments } = {}

  constructor(private config: MultisigLitecoinPaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_MULTISIG_ADDRESS_TYPE
    this.m = config.m
    this.signers = config.signers.map((signerConfig, i) => {
      signerConfig = {
        network: this.networkType,
        logger: this.logger,
        ...signerConfig,
      }
      if (signerConfig.network !== this.networkType) {
        throw new Error(`MultisigLitecoinPayments is on network ${this.networkType} but signer config ${i} is on ${signerConfig.network}`)
      }
      const payments = HdLitecoinPaymentsConfig.is(signerConfig)
        ? new HdLitecoinPayments(signerConfig)
        : new KeyPairLitecoinPayments(signerConfig)

      payments.getAccountIds().forEach((accountId) => {
        this.accountIdToSigner[accountId] = payments
      })
      return payments
    })
  }

  getFullConfig(): MultisigLitecoinPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      addressType: this.addressType,
    }
  }

  getPublicConfig(): MultisigLitecoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['logger', 'server', 'signers']),
      signers: this.signers.map((signer) => signer.getPublicConfig()),
    }
  }

  getEstimateTxSizeInputKey() {
    return `${this.addressType}:${this.m}-${this.signers.length}`
  }

  getAccountId(index: number): string {
    throw new Error('Multisig payments does not have single account for an index, use getAccountIds(index) instead')
  }

  getAccountIds(index?: number): string[] {
    return this.signers.reduce((result, signer) => ([...result, ...signer.getAccountIds(index)]), [] as string[])
  }

  getSignerPublicKeyBuffers(index: number): Buffer[] {
    return this.signers.map((signer) => signer.getKeyPair(index).publicKey)
  }

  getPaymentScript(index: number): bitcoin.payments.Payment {
    return getMultisigPaymentScript(
      this.bitcoinjsNetwork,
      this.addressType,
      this.getSignerPublicKeyBuffers(index),
      this.m,
    )
  }

  getAddress(index: number): string {
    const { address } = this.getPaymentScript(index)
    if (!address) {
      throw new Error('bitcoinjs-lib address derivation returned falsy value')
    }
    return address
  }

  private createMultisigData(index: number): BaseMultisigData {
    return {
      m: this.m,
      accountIds: this.signers.map((signer) => signer.getAccountId(index)),
      publicKeys: this.signers.map((signer) => publicKeyToString(signer.getKeyPair(index).publicKey)),
      signedAccountIds: [],
    }
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amount: Numeric,
    options?: CreateTransactionOptions,
  ): Promise<LitecoinUnsignedTransaction> {
    const tx = await super.createTransaction(from, to, amount, options)
    return {
      ...tx,
      multisigData: this.createMultisigData(from),
    }
  }

  async createMultiOutputTransaction(
    from: number,
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<LitecoinUnsignedTransaction> {
    const tx = await super.createMultiOutputTransaction(from, to, options)
    return {
      ...tx,
      multisigData: this.createMultisigData(from),
    }
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: CreateTransactionOptions = {},
  ): Promise<LitecoinUnsignedTransaction> {
    const tx = await super.createSweepTransaction(from, to, options)
    return {
      ...tx,
      multisigData: this.createMultisigData(from),
    }
  }

  private deserializeSignedTxPsbt(tx: LitecoinSignedTransaction): bitcoin.Psbt {
    if (!tx.data.partial) {
      throw new Error('Cannot decode psbt of a finalized tx')
    }
    return bitcoin.Psbt.fromHex(tx.data.hex, this.psbtOptions)
  }

  /**
   * Combines two of more partially signed transactions. Once the required # of signatures is reached (`m`)
   * the transaction is validated and finalized.
   */
  async combinePartiallySignedTransactions(txs: LitecoinSignedTransaction[]): Promise<LitecoinSignedTransaction> {
    if (txs.length < 2) {
      throw new Error(`Cannot combine ${txs.length} transactions, need at least 2`)
    }

    const unsignedTxHash = txs[0].data.unsignedTxHash
    txs.forEach(({ multisigData, inputUtxos, externalOutputs, data }, i) => {
      if (!multisigData) throw new Error(`Cannot combine signed multisig tx ${i} because multisigData is ${multisigData}`)
      if (!inputUtxos) throw new Error(`Cannot combine signed multisig tx ${i} because inputUtxos field is missing`)
      if (!externalOutputs) throw new Error(`Cannot combine signed multisig tx ${i} because externalOutputs field is missing`)
      if (data.unsignedTxHash !== unsignedTxHash) throw new Error(`Cannot combine signed multisig tx ${i} because unsignedTxHash is ${data.unsignedTxHash} when expecting ${unsignedTxHash}`)
      if (!data.partial) throw new Error(`Cannot combine signed multisig tx ${i} because partial is ${data.partial}`)
    })

    const baseTx = txs[0]
    const baseTxMultisigData = baseTx.multisigData!
    const { m } = baseTxMultisigData
    const signedAccountIds = new Set(baseTxMultisigData.signedAccountIds)

    let combinedPsbt = this.deserializeSignedTxPsbt(baseTx)
    for (let i = 1; i < txs.length; i++) {
      if (signedAccountIds.size >= m) {
        this.logger.debug('Already received enough signatures, not combining')
        break
      }
      const tx = txs[i]
      const psbt = this.deserializeSignedTxPsbt(tx)
      combinedPsbt.combine(psbt)
      tx.multisigData!.signedAccountIds.forEach((accountId) => signedAccountIds.add(accountId))
    }

    return this.updateMultisigTx(baseTx, combinedPsbt, [...signedAccountIds.values()])
  }

  async signTransaction(tx: LitecoinUnsignedTransaction): Promise<LitecoinSignedTransaction> {
    const partiallySignedTxs = await Promise.all(this.signers.map((signer) => signer.signTransaction(tx)))
    return this.combinePartiallySignedTransactions(partiallySignedTxs)
  }
}

export default MultisigLitecoinPayments
