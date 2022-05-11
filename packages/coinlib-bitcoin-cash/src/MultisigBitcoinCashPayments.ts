import { BaseBitcoinCashPayments } from './BaseBitcoinCashPayments'
import {
  MultisigBitcoinCashPaymentsConfig,
  HdBitcoinCashPaymentsConfig,
  BitcoinCashUnsignedTransaction,
  BitcoinCashSignedTransaction,
  MultisigAddressType,
  SinglesigBitcoinCashPaymentsConfig
} from './types'
import { SinglesigBitcoinCashPayments } from "./SinglesigBitcoinCashPayments"

import { omit } from 'lodash'
import { HdBitcoinCashPayments } from './HdBitcoinCashPayments'
import { KeyPairBitcoinCashPayments } from './KeyPairBitcoinCashPayments'
import * as bitcoin from 'bitcoinforksjs-lib'
import { CreateTransactionOptions, ResolveablePayport, PayportOutput } from '@bitaccess/coinlib-common'
import { AddressType } from '@bitaccess/coinlib-bitcoin/src/bitcoinish'
import { createMultisigData, preCombinePartiallySignedTransactions } from './multisigPaymentHelper'

import { getMultisigPaymentScript } from './helpers'

import { Numeric } from '@faast/ts-common'
import { DEFAULT_MULTISIG_ADDRESS_TYPE } from './constants'

export class MultisigBitcoinCashPayments extends BaseBitcoinCashPayments<MultisigBitcoinCashPaymentsConfig> {
  addressType: MultisigAddressType
  m: number
  signers: SinglesigBitcoinCashPayments<SinglesigBitcoinCashPaymentsConfig>[]
  accountIdToSigner: { [accountId: string]: SinglesigBitcoinCashPayments<SinglesigBitcoinCashPaymentsConfig> } = {}

  constructor(private config: MultisigBitcoinCashPaymentsConfig) {
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
          `MultisigBitcoinCashPayments is on network ${this.networkType} but signer config ${i} is on ${signerConfig.network}`,
        )
      }
      const payments: SinglesigBitcoinCashPayments<SinglesigBitcoinCashPaymentsConfig> = HdBitcoinCashPaymentsConfig.is(signerConfig)
        ? new HdBitcoinCashPayments(signerConfig)
        : new KeyPairBitcoinCashPayments(signerConfig)

      payments.getAccountIds().forEach(accountId => {
        this.accountIdToSigner[accountId] = payments
      })
      return payments
    })
  }

  getFullConfig(): MultisigBitcoinCashPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      addressType: this.addressType,
    }
  }

  getPublicConfig(): MultisigBitcoinCashPaymentsConfig {
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
      this.networkType,
      this.getSignerPublicKeyBuffers(index),
      this.m,
      this.validAddressFormat,
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
  ): Promise<BitcoinCashUnsignedTransaction> {
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
  ): Promise<BitcoinCashUnsignedTransaction> {
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
  ): Promise<BitcoinCashUnsignedTransaction> {
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
  ): Promise<BitcoinCashUnsignedTransaction> {
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
  async combinePartiallySignedTransactions(txs: BitcoinCashSignedTransaction[]): Promise<BitcoinCashSignedTransaction> {
    const { baseTx, combinedPsbt, updatedMultisigData } = preCombinePartiallySignedTransactions(txs, this.psbtOptions)
    return this.updateSignedMultisigTx(baseTx, combinedPsbt, updatedMultisigData)
  }

  async signTransaction(tx: BitcoinCashUnsignedTransaction): Promise<BitcoinCashSignedTransaction> {
    const partiallySignedTxs = await Promise.all(this.signers.map(signer => signer.signTransaction(tx)))
    return this.combinePartiallySignedTransactions(partiallySignedTxs)
  }

  getSupportedAddressTypes(): AddressType[] {
    return [AddressType.MultisigLegacy]
  }
}

export default MultisigBitcoinCashPayments
