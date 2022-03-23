import { cloneDeep } from 'lodash';
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
import { UtxoInfo, BaseMultisigData, MultiInputMultisigData } from '@bitaccess/coinlib-common'


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

/** Backwards compatible multisig transaction signing for non-multi input txs */
private signMultisigTransactionLegacy(
  tx: LitecoinUnsignedTransaction,
  psbt: bitcoin.Psbt,
  multisigData: BaseMultisigData,
): LitecoinSignedTransaction {
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
  tx: LitecoinUnsignedTransaction,
  psbt: bitcoin.Psbt,
  multisigData: MultiInputMultisigData,
): LitecoinSignedTransaction {

  const updatedMultisigTx = cloneDeep(multisigData)

  let inputsSigned = 0

  for (const address of Object.keys(multisigData)) {
    const addressMultisigData = multisigData[address]
    const { signerIndex, accountIds, signedAccountIds, publicKeys, inputIndices } = addressMultisigData
    const accountId = this.getAccountId(signerIndex)
    const accountIdIndex = accountIds.findIndex((x) => x === accountId)

    if (accountIdIndex === -1) {
      // Not a signer for address
      this.logger.debug(`Not a signer for address ${address} because ${accountId} is not in ${accountIds}`)
      continue
    }
    if (signedAccountIds.includes(accountId)) {
      // Already signed all inputs for this address
      this.logger.debug(`Already signed all inputs for address ${address} using account ${accountId}`)
      continue
    }

    const keyPair = this.getKeyPair(signerIndex)
    const publicKeyString = publicKeyToString(keyPair.publicKey)
    const signerPublicKey = publicKeys[accountIdIndex]
    if (signerPublicKey !== publicKeyString) {
      throw new Error(
        `Mismatched publicKey for keyPair ${accountId}/${tx.fromIndex} - `
        + `multisigData has ${signerPublicKey} but keyPair has ${publicKeyString}`
      )
    }

    for (const inputIndex of inputIndices) {
      psbt.signInput(inputIndex, keyPair)
      inputsSigned++
      this.logger.debug(`Signed tx input #${inputIndex} for address ${address}`)
    }
    updatedMultisigTx[address].signedAccountIds.push(accountId)
  }
  if (inputsSigned === 0) {
    throw new Error('No inputs were signed')
  }
  return this.updateSignedMultisigTx(tx, psbt, updatedMultisigTx)
}

  signMultisigTransaction(
    tx: LitecoinUnsignedTransaction,
  ): LitecoinSignedTransaction {
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

  async signTransaction(tx: LitecoinUnsignedTransaction): Promise<LitecoinSignedTransaction> {
    if (tx.multisigData) {
      return this.signMultisigTransaction(tx)
    }
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
