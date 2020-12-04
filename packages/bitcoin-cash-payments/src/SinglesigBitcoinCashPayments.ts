import * as bitcoin from 'bitcoinforksjs-lib'

import {
  BitcoinjsKeyPair,
  BitcoinCashSignedTransaction,
  SinglesigBitcoinCashPaymentsConfig,
  BitcoinCashUnsignedTransaction,
} from './types'
import { bitcoinish } from '@faast/bitcoin-payments'
import { getSinglesigPaymentScript } from './helpers'
import { BaseBitcoinCashPayments } from './BaseBitcoinCashPayments'

export abstract class SinglesigBitcoinCashPayments<Config extends SinglesigBitcoinCashPaymentsConfig>
  extends BaseBitcoinCashPayments<Config> {

  constructor(config: SinglesigBitcoinCashPaymentsConfig) {
    super(config)
  }

  abstract getKeyPair(index: number): BitcoinjsKeyPair

  getPaymentScript(index: number) {
    return getSinglesigPaymentScript(this.bitcoinjsNetwork, this.getKeyPair(index).publicKey)
  }

  async signTransaction(tx: BitcoinCashUnsignedTransaction): Promise<BitcoinCashSignedTransaction> {
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
