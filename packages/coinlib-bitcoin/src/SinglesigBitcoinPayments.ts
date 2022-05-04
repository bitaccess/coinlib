import {
  BitcoinjsKeyPair,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  SinglesigBitcoinPaymentsConfig,
  SinglesigAddressType,
  AddressType,
} from './types'
import { getSinglesigPaymentScript } from './helpers'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { DEFAULT_SINGLESIG_ADDRESS_TYPE } from './constants'
import { SinglesigBitcoinishPayments, signMultisigTransaction, signTransaction } from './bitcoinish'

export abstract class SinglesigBitcoinPayments<Config extends SinglesigBitcoinPaymentsConfig>
  extends BaseBitcoinPayments<Config>
  implements SinglesigBitcoinishPayments {
  addressType: SinglesigAddressType

  constructor(config: SinglesigBitcoinPaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_SINGLESIG_ADDRESS_TYPE
  }

  abstract getKeyPair(index: number): BitcoinjsKeyPair

  getPaymentScript(index: number, addressType?: SinglesigAddressType) {
    return getSinglesigPaymentScript(
      this.bitcoinjsNetwork,
      addressType || this.addressType,
      this.getKeyPair(index).publicKey,
    )
  }

  signMultisigTransaction(tx: BitcoinUnsignedTransaction): BitcoinSignedTransaction {
    return signMultisigTransaction(tx, this)
  }

  async signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction> {
    return signTransaction(tx, this)
  }

  getSupportedAddressTypes(): AddressType[] {
    return [AddressType.Legacy, AddressType.SegwitNative, AddressType.SegwitP2SH]
  }
}
