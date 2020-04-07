import * as bitcoin from 'bitcoinjs-lib'
import {
  TransactionStatus,
} from '@faast/payments-common'
import crypto from 'crypto'

import {
  BaseBitcoinPaymentsConfig,
  BitcoinishPaymentTx,
  AddressType,
  BitcoinjsKeyPair,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  SinglesigBitcoinPaymentsConfig,
  SinglesigAddressType,
} from './types'
import { toBaseDenominationNumber, publicKeyToString, getSinglesigPaymentScript } from './helpers'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { DEFAULT_SINGLESIG_ADDRESS_TYPE } from './constants'

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

  async getOrBuildPsbt(paymentTx: BitcoinishPaymentTx, fromIndex: number): Promise<bitcoin.Psbt> {
    if (paymentTx.rawHex) {
      return bitcoin.Psbt.fromHex(paymentTx.rawHex, this.psbtOptions)
    }
    return this.buildPsbt(paymentTx, fromIndex)
  }

  async signMultisigTransaction(
    tx: BitcoinUnsignedTransaction,
  ): Promise<BitcoinSignedTransaction> {
    const { multisigData, data } = tx
    if (!multisigData) {
      throw new Error('Not a multisig tx')
    }
    const txHex = data.rawHex
    if (!txHex) {
      throw new Error('Cannot sign multisig tx without unsigned tx hex')
    }
    const psbt = bitcoin.Psbt.fromHex(txHex, this.psbtOptions)
    const accountIds = this.getAccountIds()
    const updatedSignersData: typeof multisigData.signers = []
    let totalSignaturesAdded = 0
    for (let signer of multisigData.signers) {
      if (!accountIds.includes(signer.accountId)) {
        updatedSignersData.push(signer)
        continue
      }
      const keyPair = this.getKeyPair(signer.index)
      const publicKeyString = publicKeyToString(keyPair.publicKey)
      if (signer.publicKey !== publicKeyString) {
        throw new Error(
          `Mismatched publicKey for keyPair ${signer.accountId}/${signer.index} - `
          + `multisigData has ${signer.publicKey} but keyPair has ${publicKeyString}`
        )
      }
      await psbt.signAllInputsAsync(keyPair)
      updatedSignersData.push({
        ...signer,
        signed: true,
      })
      totalSignaturesAdded += 1
    }
    if (totalSignaturesAdded === 0) {
      throw new Error('Not a signer for provided multisig tx')
    }
    const newTxHex = psbt.toHex()
    return {
      ...tx,
      id: '',
      status: TransactionStatus.Signed,
      multisigData: {
        ...multisigData,
        signers: updatedSignersData,
      },
      data: {
        hex: newTxHex,
        partial: true,
        unsignedTxHash: data.rawHash,
      }
    }
  }

  async signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction> {
    if (tx.multisigData) {
      return this.signMultisigTransaction(tx)
    } else {
      const paymentTx = tx.data as BitcoinishPaymentTx
      const psbt = await this.getOrBuildPsbt(paymentTx, tx.fromIndex)

      const keyPair = this.getKeyPair(tx.fromIndex)
      await psbt.signAllInputsAsync(keyPair)

      if (!psbt.validateSignaturesOfAllInputs()) {
        throw new Error('Failed to validate signatures of all inputs')
      }
      psbt.finalizeAllInputs()
      const signedTx = psbt.extractTransaction()
      const txId = signedTx.getId()
      const txHex = signedTx.toHex()
      return {
        ...tx,
        status: TransactionStatus.Signed,
        id: txId,
        data: {
          hex: txHex,
          partial: false,
          unsignedTxHash: tx.data.rawHash,
        },
      }
    }
  }
}
