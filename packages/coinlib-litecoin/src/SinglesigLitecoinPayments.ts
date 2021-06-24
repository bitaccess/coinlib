import * as bitcoin from 'bitcoinjs-lib'
import {
  LitecoinjsKeyPair,
  LitecoinUnsignedTransaction,
  LitecoinSignedTransaction,
  SinglesigLitecoinPaymentsConfig,
  SinglesigAddressType,
} from './types'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { publicKeyToString, getSinglesigPaymentScript } from './helpers'
import { BaseLitecoinPayments } from './BaseLitecoinPayments'
import { DEFAULT_SINGLESIG_ADDRESS_TYPE } from './constants'

export abstract class SinglesigLitecoinPayments<Config extends SinglesigLitecoinPaymentsConfig>
  extends BaseLitecoinPayments<Config> {

  addressType: SinglesigAddressType

  constructor(config: SinglesigLitecoinPaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_SINGLESIG_ADDRESS_TYPE
  }

  abstract getKeyPair(index: number): LitecoinjsKeyPair

  getPaymentScript(index: number): bitcoin.payments.Payment {
    return getSinglesigPaymentScript(this.bitcoinjsNetwork, this.addressType, this.getKeyPair(index).publicKey)
  }



  async signTransaction(tx: LitecoinUnsignedTransaction): Promise<LitecoinSignedTransaction> {
    const paymentTx = tx.data as bitcoinish.BitcoinishPaymentTx
    const { rawHex } = paymentTx
    let psbt: bitcoin.Psbt
    if (rawHex) {
      psbt = bitcoin.Psbt.fromHex(rawHex, this.psbtOptions)
    } else {
      psbt = await this.buildPsbt(paymentTx, tx.fromIndex!)
    }

    const keyPair = this.getKeyPair(tx.fromIndex!)
    psbt.signAllInputs(keyPair)

    return this.validateAndFinalizeSignedTx(tx, psbt)
  }
}
