import * as bitcoin from 'bitcoinjs-lib'

import {
  BitcoinjsKeyPair,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  SinglesigBitcoinPaymentsConfig,
  SinglesigAddressType,
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

  getPaymentScript(index: number) {
    return getSinglesigPaymentScript(this.bitcoinjsNetwork, this.addressType, this.getKeyPair(index).publicKey)
  }

  signMultisigTransaction(
    tx: BitcoinUnsignedTransaction,
  ): BitcoinSignedTransaction {
    const { multisigData, data } = tx
    const { rawHex } = data

    if (!multisigData) throw new Error('Not a multisig tx')
    if (!rawHex) throw new Error('Cannot sign multisig tx without unsigned tx hex')

    const psbt = bitcoin.Psbt.fromHex(rawHex, this.psbtOptions)
    let res: BitcoinSignedTransaction | BitcoinUnsignedTransaction = tx
    const inputUtxos = tx.inputUtxos || []
    for (let i = 0; i < inputUtxos.length; i++) {
      const accountId = this.getAccountId(inputUtxos[i].signer || 0)
      const accountIdIndex = multisigData.accountIds.findIndex((x) => x === accountId)

      if (accountIdIndex === -1) {
        throw new Error('Not a signer for provided multisig tx')
      }

      const signedAccountIds = [...multisigData.signedAccountIds]
      if (signedAccountIds.includes(accountId)) {
        throw new Error('Already signed multisig tx')
      }

      const keyPair = this.getKeyPair(inputUtxos[i].signer || 0)

      const publicKeyString = publicKeyToString(keyPair.publicKey)
      const signerPublicKey = multisigData.publicKeys[accountIdIndex]
      if (signerPublicKey !== publicKeyString) {
        throw new Error(
          `Mismatched publicKey for keyPair ${accountId}/${inputUtxos[i].signer || 0} - `
          + `multisigData has ${signerPublicKey} but keyPair has ${publicKeyString}`
        )
      }
      this.validatePsbt(tx, psbt)

      psbt.signInput(i, keyPair)
      signedAccountIds.push(accountId)

      res = this.updateMultisigTx(res, psbt, signedAccountIds)
    }

    return res as BitcoinSignedTransaction
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
      const keyPair = this.getKeyPair(tx.data.inputs[i].signer || 0)
      psbt.signInput(i, keyPair)
    }

    return this.validateAndFinalizeSignedTx(tx, psbt)
  }
}
