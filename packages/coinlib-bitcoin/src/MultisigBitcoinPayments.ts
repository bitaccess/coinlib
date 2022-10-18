import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import {
  MultisigBitcoinPaymentsConfig,
  HdBitcoinPaymentsConfig,
  UHdBitcoinPaymentsConfig,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  MultisigAddressType,
  AddressType,
} from './types'
import { omit } from 'lodash'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { UHdBitcoinPayments } from './UHdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import { CreateTransactionOptions, ResolveablePayport, PayportOutput } from '@bitaccess/coinlib-common'
import { getMultisigPaymentScript } from './helpers'
import { Numeric } from '@bitaccess/ts-common'
import { DEFAULT_MULTISIG_ADDRESS_TYPE } from './constants'
import { createMultisigData, preCombinePartiallySignedTransactions, updateSignedMultisigTx } from './bitcoinish'
export class MultisigBitcoinPayments extends BaseBitcoinPayments<MultisigBitcoinPaymentsConfig> {
  addressType: MultisigAddressType
  m: number
  signers: (HdBitcoinPayments | UHdBitcoinPayments | KeyPairBitcoinPayments)[]
  accountIdToSigner: { [accountId: string]: HdBitcoinPayments | UHdBitcoinPayments | KeyPairBitcoinPayments } = {}

  constructor(private config: MultisigBitcoinPaymentsConfig) {
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
          `MultisigBitcoinPayments is on network ${this.networkType} but signer config ${i} is on ${signerConfig.network}`,
        )
      }
      let payments : HdBitcoinPayments | UHdBitcoinPayments | KeyPairBitcoinPayments
      if (HdBitcoinPaymentsConfig.is(signerConfig)) {
        payments = new HdBitcoinPayments(signerConfig)
      } else if (UHdBitcoinPaymentsConfig.is(signerConfig)) {
        payments = new UHdBitcoinPayments(signerConfig)
      } else {
        payments = new KeyPairBitcoinPayments(signerConfig)
      }


      payments.getAccountIds().forEach(accountId => {
        this.accountIdToSigner[accountId] = payments
      })
      return payments
    })
  }

  getFullConfig(): MultisigBitcoinPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      addressType: this.addressType,
    }
  }

  getPublicConfig(): MultisigBitcoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['logger', 'server', 'signers']),
      signers: this.signers.map(signer => signer.getPublicConfig()),
    }
  }

  getRequiredSignatureCounts(): { m: number; n: number; } {
    return { m: this.m, n: this.signers.length }
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
      throw new Error('bitcoinjs-lib-bigint address derivation returned falsy value')
    }
    return address
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amount: Numeric,
    options?: CreateTransactionOptions,
  ): Promise<BitcoinUnsignedTransaction> {
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
  ): Promise<BitcoinUnsignedTransaction> {
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
  ): Promise<BitcoinUnsignedTransaction> {
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
  ): Promise<BitcoinUnsignedTransaction> {
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
  async combinePartiallySignedTransactions(txs: BitcoinSignedTransaction[]): Promise<BitcoinSignedTransaction> {
    const { baseTx, combinedPsbt, updatedMultisigData } = preCombinePartiallySignedTransactions(txs, this.psbtOptions)
    return updateSignedMultisigTx(baseTx, combinedPsbt, updatedMultisigData)
  }

  async signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction> {
    const partiallySignedTxs = await Promise.all(this.signers.map(signer => signer.signTransaction(tx)))
    return this.combinePartiallySignedTransactions(partiallySignedTxs)
  }

  getSupportedAddressTypes(): AddressType[] {
    return [AddressType.MultisigLegacy, AddressType.MultisigSegwitNative, AddressType.MultisigSegwitP2SH]
  }
}

export default MultisigBitcoinPayments
