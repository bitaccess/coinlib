import * as bitcoin from 'bitcoinjs-lib'
import {
  LitecoinjsKeyPair,
  LitecoinUnsignedTransaction,
  LitecoinSignedTransaction,
  SinglesigLitecoinPaymentsConfig,
  SinglesigAddressType,
} from './types'
import { BitcoinishPaymentTx } from '@faast/bitcoin-payments/dist/lib/bitcoinish/types'
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

  getPaymentScript(index: number) {
    return getSinglesigPaymentScript(this.bitcoinjsNetwork, this.addressType, this.getKeyPair(index).publicKey)
  }

  signMultisigTransaction(
    tx: LitecoinUnsignedTransaction,
  ): LitecoinSignedTransaction {
    const { multisigData, data } = tx
    const { rawHex } = data

    if (!multisigData) throw new Error('Not a multisig tx')
    if (!rawHex) throw new Error('Cannot sign multisig tx without unsigned tx hex')

    const psbt = bitcoin.Psbt.fromHex(rawHex, this.psbtOptions)
    const accountId = this.getAccountId(tx.fromIndex)
    const accountIdIndex = multisigData.accountIds.findIndex((x) => x === accountId)
    if (accountIdIndex === -1) {
      throw new Error('Not a signer for provided multisig tx')
    }
    const signedAccountIds = [...multisigData.signedAccountIds]
    if (signedAccountIds.includes(accountId)) {
      throw new Error('Already signed multisig tx')
    }
    const keyPair = this.getKeyPair(tx.fromIndex)
    const publicKeyString = publicKeyToString(keyPair.publicKey)
    const signerPublicKey = multisigData.publicKeys[accountIdIndex]
    if (signerPublicKey !== publicKeyString) {
      throw new Error(
        `Mismatched publicKey for keyPair ${accountId}/${tx.fromIndex} - `
        + `multisigData has ${signerPublicKey} but keyPair has ${publicKeyString}`
      )
    }
    psbt.signAllInputs(keyPair)
    signedAccountIds.push(accountId)
    return this.updateMultisigTx(tx, psbt, signedAccountIds)
  }

  async signTransaction(tx: LitecoinUnsignedTransaction): Promise<LitecoinSignedTransaction> {
    if (tx.multisigData) {
      return this.signMultisigTransaction(tx)
    }
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
