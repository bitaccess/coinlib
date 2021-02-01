import * as bitcoin from 'bitcoinjs-lib-bigint'
import {
  BitcoinjsKeyPair,
  DogeSignedTransaction,
  SinglesigDogePaymentsConfig,
  DogeUnsignedTransaction,
} from './types'
import { bitcoinish, AddressType } from '@faast/bitcoin-payments'
import { getSinglesigPaymentScript } from './helpers'
import { BaseDogePayments } from './BaseDogePayments'

export abstract class SinglesigDogePayments<Config extends SinglesigDogePaymentsConfig>
  extends BaseDogePayments<Config> {

  constructor(config: SinglesigDogePaymentsConfig) {
    super(config)
  }

  abstract getKeyPair(index: number): BitcoinjsKeyPair

  getPaymentScript(index: number): bitcoin.payments.Payment {
    return getSinglesigPaymentScript(this.bitcoinjsNetwork, AddressType.Legacy, this.getKeyPair(index).publicKey)
  }

  async signTransaction(tx: DogeUnsignedTransaction): Promise<DogeSignedTransaction> {
    const paymentTx = tx.data as bitcoinish.BitcoinishPaymentTx
    const { rawHex } = paymentTx
    let psbt: bitcoin.Psbt
    if (rawHex) {
      psbt = bitcoin.Psbt.fromHex(rawHex, this.psbtOptions)
    } else {
      psbt = await this.buildPsbt(paymentTx, tx.fromIndex)
    }

    const keyPair = this.getKeyPair(tx.fromIndex)
    psbt.signAllInputs(keyPair)

    return this.validateAndFinalizeSignedTx(tx, psbt)
  }
}
