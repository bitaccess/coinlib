import { cloneDeep } from 'lodash';
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
import { UtxoInfo, BaseMultisigData, MultiInputMultisigData } from '@bitaccess/coinlib-common'

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

  /** Backwards compatible multisig transaction signing for non-multi input txs */
  private signMultisigTransactionLegacy(
    tx: BitcoinUnsignedTransaction,
    psbt: bitcoin.Psbt,
    multisigData: BaseMultisigData,
  ): BitcoinSignedTransaction {
    if (tx.fromIndex === null) throw new Error('Cannot sign legacy multisig transaction without fromIndex')

    const accountId = this.getAccountId(tx.fromIndex)
    const accountIdIndex = multisigData.accountIds.findIndex((x) => x === accountId)
    if (accountIdIndex === -1) {
      throw new Error('Not a signer for provided multisig tx')
    }
    if (multisigData.signedAccountIds.includes(accountId)) {
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
    this.validatePsbt(tx, psbt)

    psbt.signAllInputs(keyPair)

    const updatedMultisigTx = {
      ...multisigData,
      signedAccountIds: [...multisigData.signedAccountIds, accountId],
    }
    return this.updateSignedMultisigTx(tx, psbt, updatedMultisigTx)
  }

  /** Multi input multisig transaction signing */
  private signMultisigTransactionMultiInput(
    tx: BitcoinUnsignedTransaction,
    psbt: bitcoin.Psbt,
    multisigData: MultiInputMultisigData,
  ): BitcoinSignedTransaction {

    const updatedMultisigTx = cloneDeep(multisigData)

    for (let address of Object.keys(multisigData)) {
      const addressMultisigData = multisigData[address]
      const signerIndex = addressMultisigData.signerIndex
      const accountId = this.getAccountId(signerIndex)
      const accountIdIndex = addressMultisigData.accountIds.findIndex((x) => x === accountId)

      if (accountIdIndex === -1) {
        // Not a signer for address
        continue
      }
      if (addressMultisigData.signedAccountIds.includes(accountId)) {
        // Already signed all inputs for this address
        continue
      }

      const keyPair = this.getKeyPair(signerIndex)
      const publicKeyString = publicKeyToString(keyPair.publicKey)
      const signerPublicKey = addressMultisigData.publicKeys[accountIdIndex]
      if (signerPublicKey !== publicKeyString) {
        throw new Error(
          `Mismatched publicKey for keyPair ${accountId}/${tx.fromIndex} - `
          + `multisigData has ${signerPublicKey} but keyPair has ${publicKeyString}`
        )
      }

      for (let inputIndex of addressMultisigData.inputIndices) {
        psbt.signInput(inputIndex, keyPair)
      }
      updatedMultisigTx[address].signedAccountIds.push(accountId)
    }
    return this.updateSignedMultisigTx(tx, psbt, updatedMultisigTx)
  }

  signMultisigTransaction(
    tx: BitcoinUnsignedTransaction,
  ): BitcoinSignedTransaction {
    const { multisigData, data } = tx
    const { rawHex } = data

    if (!multisigData) throw new Error('Not a multisig tx')
    if (!rawHex) throw new Error('Cannot sign multisig tx without unsigned tx hex')

    const psbt = bitcoin.Psbt.fromHex(rawHex, this.psbtOptions)
    this.validatePsbt(tx, psbt)

    if (BaseMultisigData.is(multisigData)) {
      // back compat
      return this.signMultisigTransactionLegacy(tx, psbt, multisigData)
    } else {
      return this.signMultisigTransactionMultiInput(tx, psbt, multisigData)
    }
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

  getSupportedAddressTypes(): AddressType[] {
    return [
      AddressType.Legacy,
      AddressType.SegwitNative,
      AddressType.SegwitP2SH,
    ]
  }
}
