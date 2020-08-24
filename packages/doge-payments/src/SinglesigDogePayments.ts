import * as bitcoin from 'bitcoinjs-lib'
import {
  BitcoinjsKeyPair,
  DogeSignedTransaction,
  SinglesigDogePaymentsConfig,
  SinglesigAddressType,
  DogeUnsignedTransaction,
} from './types'
import { BitcoinishPaymentTx } from '@faast/bitcoin-payments'
import { publicKeyToString, getSinglesigPaymentScript } from './helpers'
import { BaseDogePayments } from './BaseDogePayments'
import { DEFAULT_SINGLESIG_ADDRESS_TYPE } from './constants'

export abstract class SinglesigDogePayments<Config extends SinglesigDogePaymentsConfig>
  extends BaseDogePayments<Config> {

  addressType: SinglesigAddressType

  constructor(config: SinglesigDogePaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_SINGLESIG_ADDRESS_TYPE
  }

  abstract getKeyPair(index: number): BitcoinjsKeyPair

  getPaymentScript(index: number) {
    return getSinglesigPaymentScript(this.bitcoinjsNetwork, this.addressType, this.getKeyPair(index).publicKey)
  }

  async signTransaction(tx: DogeUnsignedTransaction): Promise<DogeSignedTransaction> {
    const paymentTx = tx.data as BitcoinishPaymentTx
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
