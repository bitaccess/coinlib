import * as bitcoin from 'bitcoinjs-lib-bigint'
import {
  LitecoinjsKeyPair,
  LitecoinUnsignedTransaction,
  LitecoinSignedTransaction,
  SinglesigLitecoinPaymentsConfig,
  SinglesigAddressType,
  AddressType,
} from './types'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { BaseLitecoinPayments } from './BaseLitecoinPayments'
import { DEFAULT_SINGLESIG_ADDRESS_TYPE } from './constants'

export abstract class SinglesigLitecoinPayments<
  Config extends SinglesigLitecoinPaymentsConfig
> extends BaseLitecoinPayments<Config> {
  addressType: SinglesigAddressType

  constructor(config: SinglesigLitecoinPaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_SINGLESIG_ADDRESS_TYPE
  }

  abstract getKeyPair(index: number): LitecoinjsKeyPair

  getPaymentScript(index: number): bitcoin.payments.Payment {
    return bitcoinish.getSinglesigPaymentScript(this.bitcoinjsNetwork, this.addressType, this.getKeyPair(index).publicKey)
  }

  signMultisigTransaction(tx: LitecoinUnsignedTransaction): LitecoinSignedTransaction {
    return bitcoinish.signMultisigTransaction(tx, this)
  }

  async signTransaction(tx: LitecoinUnsignedTransaction): Promise<LitecoinSignedTransaction> {
    return bitcoinish.signTransaction(tx, this)
  }

  getSupportedAddressTypes(): AddressType[] {
    return [AddressType.Legacy, AddressType.SegwitNative, AddressType.SegwitNative]
  }
}
