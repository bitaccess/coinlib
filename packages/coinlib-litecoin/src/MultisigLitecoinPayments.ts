import { BaseLitecoinPayments } from './BaseLitecoinPayments'
import {
  MultisigLitecoinPaymentsConfig,
  HdLitecoinPaymentsConfig,
  LitecoinUnsignedTransaction,
  LitecoinSignedTransaction,
  MultisigAddressType,
  AddressType,
} from './types'

import { omit } from 'lodash'
import { HdLitecoinPayments } from './HdLitecoinPayments'
import { KeyPairLitecoinPayments } from './KeyPairLitecoinPayments'
import * as bitcoin from 'bitcoinjs-lib'
import { CreateTransactionOptions, ResolveablePayport, PayportOutput } from '@bitaccess/coinlib-common'
import { createMultisigData, preCombinePartiallySignedTransactions } from '@bitaccess/coinlib-bitcoin/src/bitcoinish'

import { getMultisigPaymentScript } from './helpers'

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
        throw new Error(
          `MultisigLitecoinPayments is on network ${this.networkType} but signer config ${i} is on ${signerConfig.network}`,
        )
      }
      const payments = HdLitecoinPaymentsConfig.is(signerConfig)
        ? new HdLitecoinPayments(signerConfig)
        : new KeyPairLitecoinPayments(signerConfig)

      payments.getAccountIds().forEach(accountId => {
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
      signers: this.signers.map(signer => signer.getPublicConfig()),
    }
  }

  getEstimateTxSizeInputKey() {
    return `${this.addressType}:${this.m}-${this.signers.length}`
  }

  getAccountId(index: number): string {
    throw new Error('Multisig payments does not have single account for an index, use getAccountIds(index) instead')
  }

  getAccountIds(index?: number): string[] {
    return this.signers.reduce((result, signer) => [...result, ...signer.getAccountIds(index)], [] as string[])
  }

  getSignerPublicKeyBuffers(index: number): Buffer[] {
    return this.signers.map(signer => signer.getKeyPair(index).publicKey)
  }

  getPaymentScript(index: number, addressType?: MultisigAddressType): bitcoin.payments.Payment {
    return getMultisigPaymentScript(
      this.bitcoinjsNetwork,
      addressType || this.addressType,
      this.getSignerPublicKeyBuffers(index),
      this.m,
    )
  }

  getAddress(index: number, addressType?: MultisigAddressType): string {
    const { address } = this.getPaymentScript(index, addressType)
    if (!address) {
      throw new Error('bitcoinjs-lib address derivation returned falsy value')
    }
    return address
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
      multisigData: createMultisigData(tx.inputUtxos!, this.signers, this.m),
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
      multisigData: createMultisigData(tx.inputUtxos!, this.signers, this.m),
    }
  }

  async createMultiInputTransaction(
    from: number[],
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<LitecoinUnsignedTransaction> {
    const tx = await super.createMultiInputTransaction(from, to, options)
    return {
      ...tx,
      multisigData: createMultisigData(tx.inputUtxos!, this.signers, this.m),
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
      multisigData: createMultisigData(tx.inputUtxos!, this.signers, this.m),
    }
  }

  /**
   * Combines two of more partially signed transactions. Once the required # of signatures is reached (`m`)
   * the transaction is validated and finalized.
   */
  async combinePartiallySignedTransactions(txs: LitecoinSignedTransaction[]): Promise<LitecoinSignedTransaction> {
    const { baseTx, combinedPsbt, updatedMultisigData } = preCombinePartiallySignedTransactions(txs)
    return this.updateSignedMultisigTx(baseTx, combinedPsbt, updatedMultisigData)
  }

  async signTransaction(tx: LitecoinUnsignedTransaction): Promise<LitecoinSignedTransaction> {
    const partiallySignedTxs = await Promise.all(this.signers.map(signer => signer.signTransaction(tx)))
    return this.combinePartiallySignedTransactions(partiallySignedTxs)
  }

  getSupportedAddressTypes(): AddressType[] {
    return [AddressType.MultisigLegacy, AddressType.MultisigSegwitNative, AddressType.MultisigSegwitP2SH]
  }
}

export default MultisigLitecoinPayments
