import * as bitcoin from 'bitcoinjs-lib-bigint'
import {
  BitcoinjsKeyPair,
  DogeSignedTransaction,
  SinglesigDogePaymentsConfig,
  DogeUnsignedTransaction,
  SinglesigAddressType,
} from './types'
import { bitcoinish, AddressType } from '@bitaccess/coinlib-bitcoin'
import { BaseDogePayments } from './BaseDogePayments'
import { SINGLESIG_ADDRESS_TYPE } from './constants'

export abstract class SinglesigDogePayments<Config extends SinglesigDogePaymentsConfig> extends BaseDogePayments<
  Config
> {
  addressType: SinglesigAddressType
  abstract getKeyPair(index: number): BitcoinjsKeyPair

  constructor(config: SinglesigDogePaymentsConfig) {
    super(config)
    this.addressType = config.addressType || SINGLESIG_ADDRESS_TYPE
  }

  getPaymentScript(index: number): bitcoin.payments.Payment {
    return bitcoinish.getSinglesigPaymentScript(
      this.bitcoinjsNetwork,
      this.addressType,
      this.getKeyPair(index).publicKey,
    )
  }

  signMultisigTransaction(tx: DogeUnsignedTransaction): DogeSignedTransaction {
    return bitcoinish.signMultisigTransaction(tx, this)
  }

  async signTransaction(tx: DogeUnsignedTransaction): Promise<DogeSignedTransaction> {
    return bitcoinish.signTransaction(tx, this)
  }

  getSupportedAddressTypes(): AddressType[] {
    return [AddressType.Legacy]
  }
}
