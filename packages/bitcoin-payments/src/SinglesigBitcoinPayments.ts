import { payments as bjsPayments, Psbt } from 'bitcoinjs-lib'
import {
  TransactionStatus,
} from '@faast/payments-common'

import {
  BaseBitcoinPaymentsConfig,
  BitcoinishPaymentTx,
  AddressType,
  BitcoinjsKeyPair,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction
} from './types'
import {
  DEFAULT_ADDRESS_TYPE,
} from './constants'
import { toBaseDenominationNumber, publicKeyToString } from './helpers'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'

export abstract class SinglesigBitcoinPayments<Config extends BaseBitcoinPaymentsConfig = BaseBitcoinPaymentsConfig>
  extends BaseBitcoinPayments<Config> {

  readonly addressType: AddressType

  constructor(config: BaseBitcoinPaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_ADDRESS_TYPE
  }

  abstract getKeyPair(index: number): BitcoinjsKeyPair

  async getOrBuildPsbt(paymentTx: BitcoinishPaymentTx, pubkey: Buffer): Promise<Psbt> {
    if (paymentTx.hex) {
      return Psbt.fromHex(paymentTx.hex, this.psbtOptions)
    }
    return this.buildSinglesigPsbt(paymentTx, pubkey)
  }

  async buildSinglesigPsbt(paymentTx: BitcoinishPaymentTx, pubkey: Buffer): Promise<Psbt> {
    const { inputs, outputs } = paymentTx

    const bjsPaymentParams = { pubkey, network: this.bitcoinjsNetwork }
    let bjsPayment
    if (this.addressType === AddressType.Legacy) {
      bjsPayment = bjsPayments.p2pkh(bjsPaymentParams)
    } else if (this.addressType === AddressType.SegwitP2SH) {
      bjsPayment = bjsPayments.p2sh({
        redeem: bjsPayments.p2wpkh(bjsPaymentParams),
        network: this.bitcoinjsNetwork,
      })
    } else if (this.addressType === AddressType.SegwitNative) {
      bjsPayment = bjsPayments.p2wpkh(bjsPaymentParams)
    } else {
      throw new Error(`Unsupported AddressType ${this.addressType}`)
    }

    let psbt = new Psbt(this.psbtOptions)
    for (let input of inputs) {
      const redeemType = this.addressType === AddressType.SegwitP2SH ? 'p2sh' : undefined
      psbt.addInput(await this.getPsbtInputData(
        input,
        bjsPayment,
        this.isSegwit,
        redeemType,
      ))
    }
    for (let output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: toBaseDenominationNumber(output.value)
      })
    }
    return psbt
  }

  async serializePaymentTx(tx: BitcoinishPaymentTx, fromIndex: number): Promise<string> {
    const keyPair = this.getKeyPair(fromIndex)
    const psbt = await this.buildSinglesigPsbt(tx, keyPair.publicKey)
    return psbt.extractTransaction().toHex()
  }

  async signMultisigTransaction(
    tx: BitcoinUnsignedTransaction,
  ): Promise<BitcoinSignedTransaction> {
    const { multisigData, data } = tx
    if (!multisigData) {
      throw new Error('Not a multisig tx')
    }
    const txHex = data.hex
    if (!txHex) {
      throw new Error('Cannot sign multisig tx without unsigned tx hex')
    }
    const psbt = Psbt.fromHex(txHex, this.psbtOptions)
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
      }
    }
  }

  async signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction> {
    if (tx.multisigData) {
      return this.signMultisigTransaction(tx)
    } else {
      const keyPair = this.getKeyPair(tx.fromIndex)
      const paymentTx = tx.data as BitcoinishPaymentTx
      const psbt = await this.buildSinglesigPsbt(paymentTx, keyPair.publicKey)

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
        },
      }
    }
  }
}
