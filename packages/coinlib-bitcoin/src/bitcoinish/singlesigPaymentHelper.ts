import { BaseConfig, BaseMultisigData, MultiInputMultisigData } from '@bitaccess/coinlib-common'
import {
  BitcoinishSignedTransaction,
  BitcoinishUnsignedTransaction,
  BitcoinjsKeyPair,
  BitcoinjsNetwork,
  BitcoinishPaymentTx,
} from './types'
import { publicKeyToString, validateAndFinalizeSignedTx, updateSignedMultisigTx } from './helpers'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import { cloneDeep } from 'lodash'

import { BitcoinishPayments } from './BitcoinishPayments'

export interface PsbtOptsOptional {
  network?: BitcoinjsNetwork
  maximumFeeRate?: number
}

export interface SinglesigBitcoinishPayments extends BitcoinishPayments<BaseConfig> {
  psbtOptions: PsbtOptsOptional
  getAccountId(index: number): string
  getKeyPair(index: number): BitcoinjsKeyPair
  buildPsbt(paymentTx: BitcoinishPaymentTx, fromIndex?: number): Promise<bitcoin.Psbt>
}

/** Backwards compatible multisig transaction signing for non-multi input txs */
function signMultisigTransactionLegacy(
  tx: BitcoinishUnsignedTransaction,
  psbt: bitcoin.Psbt,
  multisigData: BaseMultisigData,
  context: SinglesigBitcoinishPayments,
): BitcoinishSignedTransaction {
  if (tx.fromIndex === null) throw new Error('Cannot sign legacy multisig transaction without fromIndex')

  const accountId = context.getAccountId(tx.fromIndex)
  const accountIdIndex = multisigData.accountIds.findIndex(x => x === accountId)
  if (accountIdIndex === -1) {
    throw new Error('Not a signer for provided multisig tx')
  }
  if (multisigData.signedAccountIds.includes(accountId)) {
    throw new Error('Already signed multisig tx')
  }
  const keyPair = context.getKeyPair(tx.fromIndex)
  const publicKeyString = publicKeyToString(keyPair.publicKey)
  const signerPublicKey = multisigData.publicKeys[accountIdIndex]
  if (signerPublicKey !== publicKeyString) {
    throw new Error(
      `Mismatched publicKey for keyPair ${accountId}/${tx.fromIndex} - ` +
        `multisigData has ${signerPublicKey} but keyPair has ${publicKeyString}`,
    )
  }
  context.validatePsbt(tx, psbt)

  psbt.signAllInputs(keyPair)

  const updatedMultisigTx = {
    ...multisigData,
    signedAccountIds: [...multisigData.signedAccountIds, accountId],
  }
  return updateSignedMultisigTx(tx, psbt, updatedMultisigTx)
}

function signMultisigTransactionMultiInput(
  tx: BitcoinishUnsignedTransaction,
  psbt: bitcoin.Psbt,
  multisigData: MultiInputMultisigData,
  context: SinglesigBitcoinishPayments,
): BitcoinishSignedTransaction {
  const updatedMultisigTx = cloneDeep(multisigData)

  let inputsSigned = 0

  for (const address of Object.keys(multisigData)) {
    const addressMultisigData = multisigData[address]
    const { signerIndex, accountIds, signedAccountIds, publicKeys, inputIndices } = addressMultisigData
    const accountId = context.getAccountId(signerIndex)
    const accountIdIndex = accountIds.findIndex(x => x === accountId)

    if (accountIdIndex === -1) {
      // Not a signer for address
      context.logger.debug(`Not a signer for address ${address} because ${accountId} is not in ${accountIds}`)
      continue
    }
    if (signedAccountIds.includes(accountId)) {
      // Already signed all inputs for this address
      context.logger.debug(`Already signed all inputs for address ${address} using account ${accountId}`)
      continue
    }

    const keyPair = context.getKeyPair(signerIndex)
    const publicKeyString = publicKeyToString(keyPair.publicKey)
    const signerPublicKey = publicKeys[accountIdIndex]
    if (signerPublicKey !== publicKeyString) {
      throw new Error(
        `Mismatched publicKey for keyPair ${accountId}/${tx.fromIndex} - ` +
          `multisigData has ${signerPublicKey} but keyPair has ${publicKeyString}`,
      )
    }

    for (const inputIndex of inputIndices) {
      psbt.signInput(inputIndex, keyPair)
      inputsSigned++
      context.logger.debug(`Signed tx input #${inputIndex} for address ${address}`)
    }
    updatedMultisigTx[address].signedAccountIds.push(accountId)
  }
  if (inputsSigned === 0) {
    throw new Error('No inputs were signed')
  }
  return updateSignedMultisigTx(tx, psbt, updatedMultisigTx)
}

export function signMultisigTransaction(
  tx: BitcoinishUnsignedTransaction,
  context: SinglesigBitcoinishPayments,
): BitcoinishSignedTransaction {
  const { multisigData, data } = tx
  const { rawHex } = data

  if (!multisigData) throw new Error('Not a multisig tx')
  if (!rawHex) throw new Error('Cannot sign multisig tx without unsigned tx hex')

  const psbt = bitcoin.Psbt.fromHex(rawHex, context.psbtOptions)
  context.validatePsbt(tx, psbt)

  if (BaseMultisigData.is(multisigData)) {
    // back compat
    return signMultisigTransactionLegacy(tx, psbt, multisigData, context)
  } else {
    return signMultisigTransactionMultiInput(tx, psbt, multisigData, context)
  }
}

export async function signTransaction(
  tx: BitcoinishUnsignedTransaction,
  context: SinglesigBitcoinishPayments,
): Promise<BitcoinishSignedTransaction> {
  context.logger.log('signTransaction', JSON.stringify(tx, null, 2))
  if (tx.multisigData) {
    return signMultisigTransaction(tx, context)
  }
  const paymentTx = tx.data as BitcoinishPaymentTx
  const { rawHex } = paymentTx
  let psbt: bitcoin.Psbt
  if (rawHex) {
    psbt = bitcoin.Psbt.fromHex(rawHex, context.psbtOptions)
  } else {
    psbt = await context.buildPsbt(paymentTx)
  }
  context.validatePsbt(tx, psbt)

  for (let i = 0; i < tx.data.inputs.length; i++) {
    if (typeof tx.data.inputs[i].signer === 'undefined') {
      throw new Error('Uxto needs to have signer provided')
    }
    const keyPair = context.getKeyPair(tx.data.inputs[i].signer!)
    psbt.signInput(i, keyPair)
  }

  return validateAndFinalizeSignedTx(tx, psbt)
}
