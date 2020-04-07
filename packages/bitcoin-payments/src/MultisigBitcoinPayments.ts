import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import {
  MultisigBitcoinPaymentsConfig,
  HdBitcoinPaymentsConfig,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  PayportOutput,
  BitcoinMultisigData,
  MultisigAddressType,
} from './types'
import { omit } from 'lodash'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'
import * as bitcoin from 'bitcoinjs-lib'
import { CreateTransactionOptions, ResolveablePayport } from '@faast/payments-common'
import { publicKeyToString, getMultisigPaymentScript } from './helpers';
import { Numeric } from '@faast/ts-common'
import { DEFAULT_MULTISIG_ADDRESS_TYPE } from './constants';

export class MultisigBitcoinPayments extends BaseBitcoinPayments<MultisigBitcoinPaymentsConfig> {

  addressType: MultisigAddressType
  m: number
  signers: (HdBitcoinPayments | KeyPairBitcoinPayments)[]

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
        throw new Error(`MultisigBitcoinPayments is on network ${this.networkType} but signer config ${i} is on ${signerConfig.network}`)
      }
      if (HdBitcoinPaymentsConfig.is(signerConfig)) {
        return new HdBitcoinPayments(signerConfig)
      } else {
        return new KeyPairBitcoinPayments(signerConfig)
      }
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
      signers: this.signers.map((signer) => signer.getPublicConfig()),
    }
  }

  getAccountId(index: number): string {
    throw new Error('Multisig payments does not have single account for an index, use getAccountIds(index) instead')
  }

  getAccountIds(index?: number): string[] {
    return this.signers.reduce((result, signer) => ([...result, ...signer.getAccountIds(index)]), [] as string[])
  }

  getSignerPublicKeys(index: number) {
    return this.signers.map((signer) => signer.getKeyPair(index).publicKey)
  }

  getPaymentScript(index: number) {
    return getMultisigPaymentScript(this.bitcoinjsNetwork, this.addressType, this.getSignerPublicKeys(index), this.m)
  }

  getAddress(index: number): string {
    const { address } = this.getPaymentScript(index)
    if (!address) {
      throw new Error('bitcoinjs-lib address derivation returned falsy value')
    }
    return address
  }

  private getMultisigData(index: number): BitcoinMultisigData {
    return {
      m: this.m,
      signers: this.signers.map((signer) => ({
        accountId: signer.getAccountId(index),
        index: index,
        publicKey: publicKeyToString(signer.getKeyPair(index).publicKey)
      }))
    }
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
      multisigData: this.getMultisigData(from),
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
      multisigData: this.getMultisigData(from),
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
      multisigData: this.getMultisigData(from),
    }
  }

  getSignedPubKeys(multisigData: BitcoinMultisigData): string[] {
    return multisigData.signers.filter(({ signed }) => signed).map(({ publicKey }) => publicKey)
  }

  async combinePartiallySignedTransactions(txs: BitcoinSignedTransaction[]): Promise<BitcoinSignedTransaction> {
    if (txs.length < 2) {
      throw new Error(`Cannot combine ${txs.length} transactions, need at least 2`)
    }
    const unsignedTxHash = txs[0].data.unsignedTxHash
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i]
      const { multisigData, inputUtxos, externalOutputs } = tx
      if (!multisigData) {
        throw new Error(`Cannot combine signed multisig tx ${i} because multisigData is ${multisigData}`)
      }
      if (!inputUtxos) {
        throw new Error(`Cannot combine signed multisig tx ${i} because inputUtxos field is missing`)
      }
      if (!externalOutputs) {
        throw new Error(`Cannot combine signed multisig tx ${i} because externalOutputs field is missing`)
      }
      if (tx.data.unsignedTxHash !== unsignedTxHash) {
        throw new Error(`Cannot combine signed multisig tx ${i} because unsignedTxHash is ${tx.data.unsignedTxHash} when expecting ${unsignedTxHash}`)
      }
      if (!tx.data.partial) {
        throw new Error(`Cannot combine signed multisig tx ${i} because partial is ${tx.data.partial}`)
      }
    }

    const baseTx = txs[0]
    const baseTxMultisigData = baseTx.multisigData!
    const { m } = baseTxMultisigData
    const signedPubKeys = new Set(this.getSignedPubKeys(baseTxMultisigData))

    let combinedPsbt = this.decodePsbt(baseTx)
    for (let i = 1; i < txs.length; i++) {
      if (signedPubKeys.size >= m) {
        this.logger.debug('Already received enough signatures, not combining')
        break
      }
      const tx = txs[i]
      const psbt = this.decodePsbt(tx)
      combinedPsbt.combine(psbt)
      this.getSignedPubKeys(tx.multisigData!).forEach((pubkey) => signedPubKeys.add(pubkey))
    }
    const combinedHex = combinedPsbt.toHex()
    const combinedSignerData = baseTxMultisigData.signers.map((signer) => {
      if (signedPubKeys.has(signer.publicKey)) {
        return {
          ...signer,
          signed: true,
        }
      }
      return signer
    })
    if (signedPubKeys.size >= m) {
      if (!combinedPsbt.validateSignaturesOfAllInputs()) {
        throw new Error('combined psbt signature validation failed')
      }
      combinedPsbt.finalizeAllInputs()
      const extractedTx = combinedPsbt.extractTransaction()
      const txId = extractedTx.getId()
      const finalizedHex = extractedTx.toHex()
      return {
        ...baseTx,
        id: txId,
        multisigData: {
          ...baseTxMultisigData,
          signers: combinedSignerData,
        },
        data: {
          hex: finalizedHex,
          partial: false,
          unsignedTxHash,
        }
      }
    } else {
      return {
        ...baseTx,
        multisigData: {
          ...baseTxMultisigData,
          signers: combinedSignerData,
        },
        data: {
          hex: combinedHex,
          partial: true,
          unsignedTxHash,
        }
      }
    }
  }

  async signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction> {
    const partiallySignedTxs = await Promise.all(this.signers.map((signer) => signer.signTransaction(tx)))
    return this.combinePartiallySignedTransactions(partiallySignedTxs)
  }
}

export default MultisigBitcoinPayments
