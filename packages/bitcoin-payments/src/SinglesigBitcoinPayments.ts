import * as bitcoin from 'bitcoinjs-lib'

import {
  BitcoinjsKeyPair,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  SinglesigBitcoinPaymentsConfig,
  SinglesigAddressType,
  AddressType,
} from './types'
import { BitcoinishPaymentTx, BitcoinishTxOutput } from './bitcoinish/types'
import { publicKeyToString, getSinglesigPaymentScript } from './helpers'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { DEFAULT_SINGLESIG_ADDRESS_TYPE } from './constants'
import BigNumber from 'bignumber.js'
import { UtxoInfo } from '@faast/payments-common';

export abstract class SinglesigBitcoinPayments<Config extends SinglesigBitcoinPaymentsConfig>
  extends BaseBitcoinPayments<Config> {

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
      this.getKeyPair(index).publicKey
    )
  }

  signMultisigTransaction(
    tx: BitcoinUnsignedTransaction,
  ): BitcoinSignedTransaction {
    const { multisigData, data } = tx
    const { rawHex } = data

    if (!multisigData) throw new Error('Not a multisig tx')
    if (!rawHex) throw new Error('Cannot sign multisig tx without unsigned tx hex')

    const psbt = bitcoin.Psbt.fromHex(rawHex, this.psbtOptions)
    const signedAccountIds = new Set(...multisigData.signedAccountIds)

    for (let i = 0; i < tx.data.inputs.length; i++) {
      const accountId = this.getAccountId(tx.data.inputs[i].signer!)
      const accountIdIndex = multisigData.accountIds.findIndex((x) => x === accountId)

      if (accountIdIndex === -1) {
        throw new Error('Not a signer for provided multisig tx')
      }

      const keyPair = this.getKeyPair(tx.data.inputs[i].signer!)
      const publicKeyString = publicKeyToString(keyPair.publicKey)
      const signerPublicKey = multisigData.publicKeys[accountIdIndex]
      if (signerPublicKey !== publicKeyString) {
        continue
      }
      this.validatePsbt(tx, psbt)

      psbt.signInput(i, keyPair)
      signedAccountIds.add(accountId)
    }
    return this.updateMultisigTx(tx, psbt, [...signedAccountIds])
  }

  async signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction> {
    this.logger.log('signTransaction', JSON.stringify(tx, null, 2))
    if (tx.multisigData) {
      return this.signMultisigTransaction(tx)
    }
    const paymentTx = tx.data as BitcoinishPaymentTx
    const { rawHex } = paymentTx
    let psbt: bitcoin.Psbt
    if (rawHex) {
      psbt = bitcoin.Psbt.fromHex(rawHex, this.psbtOptions)
    } else {
      psbt = await this.buildPsbt(paymentTx)
    }
    this.validatePsbt(tx, psbt)

    for(let i = 0; i < tx.data.inputs.length; i++) {
      if (typeof tx.data.inputs[i].signer === 'undefined') {
        throw new Error('Uxto needs to have signer provided')
      }
      const keyPair = this.getKeyPair(tx.data.inputs[i].signer!)
      psbt.signInput(i, keyPair)
    }

    return this.validateAndFinalizeSignedTx(tx, psbt)
  }

  getAddressType(address?: string): SinglesigAddressType {
    if (!address) {
      return this.addressType
    }

    if (address.startsWith('1') || address.startsWith('m') || address.startsWith('n')) {
      return AddressType.Legacy
    } else if (address.startsWith('3') || address.startsWith('2')) {
      return AddressType.SegwitP2SH
    } else if (address.startsWith('bc1') ||  address.startsWith('tb1')) {
      return AddressType.SegwitNative
    } else {
      throw new Error('Failed to identify address')
    }
  }
}
