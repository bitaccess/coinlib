import * as bitcoinCash from 'bitcoinforksjs-lib'
import bchAddr from 'bchaddrjs'
import { bitcoinish, AddressType } from '@bitaccess/coinlib-bitcoin'
import { UtxoInfo, TransactionStatus, MultisigData } from '@bitaccess/coinlib-common'
import { isMultisigFullySigned } from '@bitaccess/coinlib-bitcoin/src/bitcoinish'
import { toBitcoinishConfig } from './utils'
import {
  BaseBitcoinCashPaymentsConfig,
  BitcoinCashUnsignedTransaction,
  BitcoinCashSignedTransactionData,
  BitcoinCashSignedTransaction,
  PsbtInputData,
  BitcoinCashAddressFormat,
} from './types'
import { BITCOIN_SEQUENCE_RBF, SINGLESIG_ADDRESS_TYPE, DEFAULT_ADDRESS_FORMAT } from './constants'
import { estimateBitcoinCashTxSize } from './helpers'
import { BitcoinCashPaymentsUtils } from './BitcoinCashPaymentsUtils'
import BigNumber from 'bignumber.js'

export abstract class BaseBitcoinCashPayments<
  Config extends BaseBitcoinCashPaymentsConfig
> extends bitcoinish.BitcoinishPayments<Config> {
  readonly maximumFeeRate?: number
  readonly validAddressFormat: BitcoinCashAddressFormat
  readonly utils: BitcoinCashPaymentsUtils

  constructor(config: BaseBitcoinCashPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
    this.validAddressFormat = config.validAddressFormat || DEFAULT_ADDRESS_FORMAT
    this.utils = new BitcoinCashPaymentsUtils(config)
  }

  abstract addressType: AddressType
  abstract getPaymentScript(index: number): bitcoinCash.payments.Payment

  async createServiceTransaction(): Promise<null> {
    return null
  }

  isValidAddress(address: string, options?: { format?: string }): boolean {
    return this.utils.isValidAddress(address, options)
  }

  standardizeAddress(address: string, options?: { format?: string }): string | null {
    return this.utils.standardizeAddress(address, options)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return this.utils.isValidPrivateKey(privateKey)
  }

  isValidPublicKey(publicKey: string): boolean {
    return this.utils.isValidPublicKey(publicKey)
  }

  /** Return a string that can be passed into estimateBitcoinCashTxSize. Override to support multisig */
  getEstimateTxSizeInputKey(): string {
    return this.addressType
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateBitcoinCashTxSize(
      { [this.getEstimateTxSizeInputKey()]: inputCount },
      {
        ...bitcoinish.countOccurences(externalOutputAddresses),
        [this.addressType]: changeOutputCount,
      },
      this.networkType,
    )
  }

  async getPsbtInputData(utxo: UtxoInfo, paymentScript: bitcoinCash.payments.Payment): Promise<PsbtInputData> {
    const txHex = utxo.txHex ?? (await this.getApi().getTx(utxo.txid)).hex
    if (!txHex) {
      throw new Error(`Cannot get raw hex of tx for utxo ${utxo.txid}:${utxo.vout}`)
    }

    const result: PsbtInputData = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: BITCOIN_SEQUENCE_RBF,
      nonWitnessUtxo: Buffer.from(txHex, 'hex'),
    }
    if (this.addressType.startsWith('p2sh')) {
      result.redeemScript = paymentScript.redeem!.output
    }
    return result
  }

  get psbtOptions() {
    return {
      network: this.bitcoinjsNetwork,
      maximumFeeRate: this.maximumFeeRate,
    }
  }

  async buildPsbt(paymentTx: bitcoinish.BitcoinishPaymentTx, fromIndex?: number): Promise<bitcoinCash.Psbt> {
    const { inputs, outputs } = paymentTx
    const psbt = new bitcoinCash.Psbt(this.psbtOptions)
    const hashType = bitcoinCash.Transaction.SIGHASH_ALL | bitcoinCash.Transaction.SIGHASH_BITCOINCASHBIP143

    for (const input of inputs) {
      const signer = input.signer ?? fromIndex
      if (typeof signer === 'undefined') {
        throw new Error('Signer index for utxo is not provided')
      }
      psbt.addInput({
        ...(await this.getPsbtInputData(input, this.getPaymentScript(signer))),
        sighashType: hashType,
      })
    }
    for (const output of outputs) {
      psbt.addOutput({
        address: bchAddr.toLegacyAddress(output.address),
        value: this.toBaseDenominationNumber(output.value),
      })
    }
    return psbt
  }

  async serializePaymentTx(tx: bitcoinish.BitcoinishPaymentTx, fromIndex?: number): Promise<string> {
    return (await this.buildPsbt(tx, fromIndex)).toHex()
  }

  validateAndFinalizeSignedTx(
    tx: BitcoinCashSignedTransaction | BitcoinCashUnsignedTransaction,
    psbt: bitcoinCash.Psbt,
  ): BitcoinCashSignedTransaction {
    if (!psbt.validateSignaturesOfAllInputs()) {
      throw new Error('Failed to validate signatures of all inputs')
    }
    psbt.finalizeAllInputs()
    const signedTx = psbt.extractTransaction()
    const txId = signedTx.getId()
    const txHex = signedTx.toHex()
    const txData = tx.data
    const unsignedTxHash = BitcoinCashSignedTransactionData.is(txData) ? txData.unsignedTxHash : txData.rawHash
    return {
      ...tx,
      status: TransactionStatus.Signed,
      id: txId,
      data: {
        hex: txHex,
        partial: false,
        unsignedTxHash,
        changeOutputs: tx.data?.changeOutputs,
      },
    }
  }

  updateSignedMultisigTx(
    tx: BitcoinCashSignedTransaction | BitcoinCashUnsignedTransaction,
    psbt: bitcoinCash.Psbt,
    updatedMultisigData: MultisigData,
  ): BitcoinCashSignedTransaction {
    if (isMultisigFullySigned(updatedMultisigData)) {
      const finalizedTx = this.validateAndFinalizeSignedTx(tx, psbt)
      return {
        ...finalizedTx,
        multisigData: updatedMultisigData,
      }
    }
    const combinedHex = psbt.toHex()
    const unsignedTxHash = BitcoinCashSignedTransactionData.is(tx.data) ? tx.data.unsignedTxHash : tx.data.rawHash
    return {
      ...tx,
      id: '',
      status: TransactionStatus.Signed,
      multisigData: updatedMultisigData,
      data: {
        hex: combinedHex,
        partial: true,
        unsignedTxHash,
        changeOutputs: tx.data?.changeOutputs,
      },
    }
  }

  private validatePsbtBitcoinCashOutput(
    output: bitcoinish.BitcoinishTxOutput,
    psbtOutput: bitcoinCash.PsbtTxOutput,
    i: number,
  ) {
    if (!output.address || !psbtOutput.address) {
      throw new Error(
        `Invalid tx: psbt output ${i} psbtOutput address (${psbtOutput.address}) or output address (${output.address}) should not be empty`,
      )
    }
    if (this.standardizeAddress(output.address) !== this.standardizeAddress(psbtOutput.address)) {
      throw new Error(
        `Invalid tx: psbt output ${i} address (${psbtOutput.address}) doesn't match expected address ${output.address}`,
      )
    }
    const value = this.toMainDenomination(psbtOutput.value)
    if (output.value !== value) {
      throw new Error(`Invalid tx: psbt output ${i} value (${value}) doesn't match expected value (${output.value})`)
    }
  }

  private validatePsbtBitcoinCashInput(input: UtxoInfo, psbtInput: bitcoinCash.PsbtTxInput, i: number) {
    // bitcoinjs psbt input hash buffer is reversed
    const hash = Buffer.from(Buffer.from(psbtInput.hash).reverse()).toString('hex')
    if (input.txid !== hash) {
      throw new Error(`Invalid tx: psbt input ${i} hash (${hash}) doesn't match expected txid (${input.txid})`)
    }
    if (input.vout !== psbtInput.index) {
      throw new Error(
        `Invalid tx: psbt input ${i} index (${psbtInput.index}) doesn't match expected vout (${input.vout})`,
      )
    }
  }

  /**
   * Assert that a psbt is equivalent to the provided unsigned tx. Used to check a psbt actually
   * reflects the expected transaction before signing.
   */
  validatePsbtBitcoinCash(tx: bitcoinish.BitcoinishUnsignedTransaction, psbt: bitcoinCash.Psbt) {
    const { data, externalOutputs, inputUtxos } = tx
    const psbtOutputs = psbt.txOutputs
    const psbtInputs = psbt.txInputs

    if (!inputUtxos) {
      throw new Error('Invalid tx: Missing inputUtxos')
    }
    if (!data.inputs) {
      throw new Error('Invalid tx: Missing data.inputs')
    }
    if (!externalOutputs) {
      throw new Error('Invalid tx: Missing externalOutputs')
    }
    if (!data.externalOutputs) {
      throw new Error('Invalid tx: Missing data.externalOutputs')
    }
    if (!data.changeOutputs) {
      throw new Error('Invalid tx: Missing data.changeOutputs')
    }
    if (!data.externalOutputTotal) {
      throw new Error('Invalid tx: Missing data.externalOutputTotal')
    }
    if (!data.change) {
      throw new Error('Invalid tx: Missing data.change')
    }

    // Check inputs

    if (inputUtxos.length !== data.inputs.length) {
      throw new Error(
        `Invalid tx: inputUtxos length (${psbtInputs.length}) doesn't match data.inputs length (${data.inputs.length})`,
      )
    }
    if (psbtInputs.length !== data.inputs.length) {
      throw new Error(
        `Invalid tx: psbt inputs length (${psbtInputs.length}) doesn't match data.inputs length (${data.inputs.length})`,
      )
    }

    let inputTotal = new BigNumber(0)

    // Safe to assume inputs are consistently ordered
    for (let i = 0; i < psbtInputs.length; i++) {
      const psbtInput = psbtInputs[i]
      this.validatePsbtBitcoinCashInput(inputUtxos[i], psbtInput, i)
      this.validatePsbtBitcoinCashInput(data.inputs[i], psbtInput, i)
      inputTotal = inputTotal.plus(data.inputs[i].value)
    }

    // Check outputs

    if (externalOutputs.length !== data.externalOutputs.length) {
      throw new Error(
        `Invalid tx: externalOutputs length (${externalOutputs.length}) doesn't match data.externalOutputs length (${data.externalOutputs.length})`,
      )
    }
    const expectedOutputCount = data.externalOutputs.length + data.changeOutputs.length
    if (psbtOutputs.length !== expectedOutputCount) {
      throw new Error(
        `Invalid tx: psbt outputs length (${psbtOutputs.length}) doesn't match external + change output length (${expectedOutputCount})`,
      )
    }

    if (externalOutputs.length === 1 && externalOutputs[0].address !== tx.toAddress) {
      throw new Error(
        `Invalid tx: toAddress (${tx.toAddress}) doesn't match external output 0 address (${externalOutputs[0].address})`,
      )
    } else if (externalOutputs.length > 1 && tx.toAddress !== 'batch') {
      throw new Error(`Invalid tx: toAddress (${tx.toAddress}) should be "batch" for multi output transaction`)
    }

    let externalOutputTotal = new BigNumber(0) // main denom
    let changeOutputTotal = new BigNumber(0) // main denom

    // Safe to assume outputs are consistently ordered with external followed by change
    for (let i = 0; i < psbtOutputs.length; i++) {
      const psbtOutput = psbtOutputs[i]
      if (i < externalOutputs.length) {
        this.validatePsbtBitcoinCashOutput(externalOutputs[i], psbtOutput, i)
        this.validatePsbtBitcoinCashOutput(data.externalOutputs[i], psbtOutput, i)
        externalOutputTotal = externalOutputTotal.plus(data.externalOutputs[i].value)
      } else {
        const changeOutputIndex = i - externalOutputs.length
        const changeOutput = data.changeOutputs[changeOutputIndex]
        this.validatePsbtBitcoinCashOutput(changeOutput, psbtOutput, i)

        // If we stop reusing addresses in the future this will need to be changed
        if (tx.fromAddress !== 'batch' && changeOutput.address !== tx.fromAddress) {
          throw new Error(
            `Invalid tx: change output ${i} address (${changeOutput.address}) doesn't match fromAddress (${tx.fromAddress})`,
          )
        }

        if (data.changeAddress !== null && data.changeAddress !== changeOutput.address) {
          throw new Error(
            `Invalid tx: change output ${i} address (${changeOutput.address}) doesn't match data.changeAddress (${data.changeAddress})`,
          )
        }
        changeOutputTotal = changeOutputTotal.plus(changeOutput.value)
      }
    }

    // Check totals

    if (data.inputTotal && !inputTotal.eq(data.inputTotal)) {
      throw new Error(
        `Invalid tx: data.externalOutputTotal (${data.externalOutputTotal}) doesn't match expected external output total (${externalOutputTotal})`,
      )
    }
    if (data.externalOutputTotal && !externalOutputTotal.eq(data.externalOutputTotal)) {
      throw new Error(
        `Invalid tx: data.externalOutputTotal (${data.externalOutputTotal}) doesn't match expected external output total (${externalOutputTotal})`,
      )
    }
    if (!changeOutputTotal.eq(data.change)) {
      throw new Error(
        `Invalid tx: data.change (${data.externalOutputTotal}) doesn't match expected change output total (${externalOutputTotal})`,
      )
    }
    if (!externalOutputTotal.eq(tx.amount)) {
      throw new Error(
        `Invalid tx: amount (${tx.amount}) doesn't match expected external output total (${externalOutputTotal})`,
      )
    }
    const expectedFee = inputTotal.minus(externalOutputTotal).minus(changeOutputTotal)
    if (!expectedFee.eq(tx.fee)) {
      throw new Error(`Invalid tx: fee (${tx.fee}) doesn't match expected fee (${expectedFee})`)
    }
  }
}
