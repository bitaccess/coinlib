import * as bitcoin from 'bitcoinjs-lib'

import {
  BitcoinjsKeyPair,
  BitcoinCashSignedTransaction,
  SinglesigBitcoinCashPaymentsConfig,
  SinglesigAddressType,
  BitcoinCashUnsignedTransaction,
} from './types'
import { BitcoinishPaymentTx } from '@faast/bitcoin-payments'
import { publicKeyToString, getSinglesigPaymentScript } from './helpers'
import { BaseBitcoinCashPayments } from './BaseBitcoinCashPayments'
import { DEFAULT_SINGLESIG_ADDRESS_TYPE } from './constants'

export abstract class SinglesigBitcoinCashPayments<Config extends SinglesigBitcoinCashPaymentsConfig>
  extends BaseBitcoinCashPayments<Config> {

  addressType: SinglesigAddressType

  constructor(config: SinglesigBitcoinCashPaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_SINGLESIG_ADDRESS_TYPE
  }

  abstract getKeyPair(index: number): BitcoinjsKeyPair

  getPaymentScript(index: number) {
    return getSinglesigPaymentScript(this.bitcoinjsNetwork, this.addressType, this.getKeyPair(index).publicKey)
  }

  async signTransaction(tx: BitcoinCashUnsignedTransaction): Promise<BitcoinCashSignedTransaction> {
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
