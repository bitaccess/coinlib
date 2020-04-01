import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import {
  MultisigBitcoinPaymentsConfig,
  HdBitcoinPaymentsConfig,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  PayportOutput,
  BitcoinishUnsignedTransaction,
  BitcoinMultisigData,
} from './types'
import { omit } from 'lodash'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'
import * as bitcoin from 'bitcoinjs-lib'
import { CreateTransactionOptions, ResolveablePayport } from '@faast/payments-common'
import { publicKeyToString } from './helpers'
import { Numeric } from '@faast/ts-common'

export class MultisigBitcoinPayments extends BaseBitcoinPayments<MultisigBitcoinPaymentsConfig> {

  m: number
  signers: (HdBitcoinPayments | KeyPairBitcoinPayments)[]

  constructor(private config: MultisigBitcoinPaymentsConfig) {
    super(config)
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
    return this.config
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

  private getPaymentScript(index: number) {
    const pubkeys = this.signers.map((signer) => signer.getKeyPair(index).publicKey).sort()
    const script = bitcoin.payments.p2sh({
      network: this.bitcoinjsNetwork,
      redeem: bitcoin.payments.p2wsh({
        network: this.bitcoinjsNetwork,
        redeem: bitcoin.payments.p2ms({
          network: this.bitcoinjsNetwork,
          m: this.m,
          pubkeys,
        })
      })
    })
    return script
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
  ): Promise<BitcoinishUnsignedTransaction> {
    const tx = super.createTransaction(from, to, amount, options)
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
    const tx = super.createMultiOutputTransaction(from, to, options)
    return {
      ...tx,
      multisigData: this.getMultisigData(from),
    }
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    const tx = super.createSweepTransaction(from, to, options)
    return {
      ...tx,
      multisigData: this.getMultisigData(from),
    }
  }

  async combinePartiallySignedTransactions(txs: BitcoinSignedTransaction[]): Promise<BitcoinSignedTransaction> {
    if (txs.length < 2) {
      throw new Error(`Cannot combine ${txs.length} transactions, need at least 2`)
    }
    const baseTx = txs[0]
    const signedPubKeys = new Set()
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i]
      const { multisigData } = tx
      if (!multisigData) {
        throw new Error(`tx ${i} cannot be combined because it has no multisigData`)
      }
      for (let signer of multisigData.signers) {
        if (signer.signed) {
          signedPubKeys.add(signer.publicKey)
        }
      }
    }
    const baseTxMultisigData = baseTx.multisigData!
    let combinedPsbt = this.decodePsbt(baseTx)
    for (let i = 1; i < txs.length; i++) {
      const tx = txs[i]
      const psbt = this.decodePsbt(tx)
      combinedPsbt.combine(psbt)
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
    const m = baseTxMultisigData.m
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
          psbt: combinedHex,
          hex: finalizedHex,
          partial: false,
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
