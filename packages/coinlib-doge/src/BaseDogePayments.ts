import * as bitcoin from 'bitcoinjs-lib-bigint'
import { FeeRate, AutoFeeLevels, UtxoInfo, TransactionStatus, MultisigData } from '@bitaccess/coinlib-common'
import { AddressType, bitcoinish } from '@bitaccess/coinlib-bitcoin'

import { toBitcoinishConfig } from './utils'
import {
  BaseDogePaymentsConfig,
  DogeUnsignedTransaction,
  DogeSignedTransactionData,
  DogeSignedTransaction,
  PsbtInputData,
  PsbtTxInput,
  PsbtTxOutput
} from './types'
import { BITCOIN_SEQUENCE_RBF, DEFAULT_FEE_LEVEL_BLOCK_TARGETS, SINGLESIG_ADDRESS_TYPE } from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress, estimateDogeTxSize } from './helpers'
import { isMultisigFullySigned,BitcoinishPayments, BitcoinishPaymentTx, BitcoinishTxOutput, countOccurences, getBlockcypherFeeRecommendation, BitcoinishUnsignedTransaction} from '@bitaccess/coinlib-bitcoin/src/bitcoinish'

import BigNumber from 'bignumber.js'

// tslint:disable-next-line:max-line-length
export abstract class BaseDogePayments<Config extends BaseDogePaymentsConfig> extends bitcoinish.BitcoinishPayments<
  Config
> {
  readonly maximumFeeRate?: number
  readonly addressType: AddressType

  constructor(config: BaseDogePaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
    this.addressType = AddressType.Legacy
    this.feeLevelBlockTargets = config.feeLevelBlockTargets ?? DEFAULT_FEE_LEVEL_BLOCK_TARGETS
  }

  abstract getPaymentScript(index: number): bitcoin.payments.Payment

  async createServiceTransaction(): Promise<null> {
    return null
  }

  isValidAddress(address: string): boolean {
    return isValidAddress(address, this.networkType)
  }

  standardizeAddress(address: string) {
    return standardizeAddress(address, this.networkType)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return isValidPrivateKey(privateKey, this.networkType)
  }

  isValidPublicKey(publicKey: string): boolean {
    return isValidPublicKey(publicKey, this.networkType)
  }

  /** Return a string that can be passed into estimateDogeTxSize. Override to support multisig */
  getEstimateTxSizeInputKey(): string {
    return SINGLESIG_ADDRESS_TYPE
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateDogeTxSize(
      { [this.getEstimateTxSizeInputKey()]: inputCount },
      {
        ...bitcoinish.countOccurences(externalOutputAddresses),
        [SINGLESIG_ADDRESS_TYPE]: changeOutputCount,
      },
      this.networkType,
    )
  }

  async getPsbtInputData(
    utxo: UtxoInfo,
    paymentScript: bitcoin.payments.Payment,
    addressType: AddressType = SINGLESIG_ADDRESS_TYPE,
  ): Promise<PsbtInputData> {
    const utx = await this.getApi().getTx(utxo.txid)
    const result: PsbtInputData = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: BITCOIN_SEQUENCE_RBF,
    }
    if (/p2wpkh|p2wsh/.test(addressType)) {
      // for segwit inputs, you only need the output script and value as an object.
      const rawUtxo = utx.vout[utxo.vout]
      const { hex: scriptPubKey, value: rawValue } = rawUtxo
      if (!scriptPubKey) {
        throw new Error(`Cannot get scriptPubKey for utxo ${utxo.txid}:${utxo.vout}`)
      }
      const utxoValue = this.toBaseDenominationString(utxo.value)
      if (utxoValue !== rawValue) {
        throw new Error(
          `Utxo ${utxo.txid}:${utxo.vout} has mismatched value - ${utxoValue} sat expected but network reports ${rawValue} sat`,
        )
      }
      result.witnessUtxo = {
        script: Buffer.from(scriptPubKey, 'hex'),
        value: BigInt(utxoValue),
      }
    } else {
      // for non segwit inputs, you must pass the full transaction buffer
      if (!utx.hex) {
        throw new Error(`Cannot get raw hex of tx for utxo ${utxo.txid}:${utxo.vout}`)
      }
      result.nonWitnessUtxo = Buffer.from(utx.hex, 'hex')
    }
    if (addressType.startsWith('p2sh-p2wsh')) {
      result.witnessScript = paymentScript.redeem?.redeem?.output
      result.redeemScript = paymentScript.redeem?.output
    } else if (addressType.startsWith('p2sh')) {
      result.redeemScript = paymentScript.redeem?.output
    } else if (addressType.startsWith('p2wsh')) {
      result.witnessScript = paymentScript.redeem?.output
    }
    return result
  }

  get psbtOptions() {
    return {
      network: this.bitcoinjsNetwork,
      maximumFeeRate: this.maximumFeeRate,
    }
  }

  async buildPsbt(paymentTx: bitcoinish.BitcoinishPaymentTx, fromIndex?: number): Promise<bitcoin.Psbt> {
    const { inputs, outputs } = paymentTx

    const psbt = new bitcoin.Psbt(this.psbtOptions)
    for (const input of inputs) {
      const signer = input.signer ?? fromIndex
      if (typeof signer === 'undefined') {
        throw new Error('Signer index for utxo is not provided')
      }
      psbt.addInput(await this.getPsbtInputData(
        input,
        this.getPaymentScript(signer),
        this.addressType,
      ))
    }
    for (const output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: this.toBaseDenominationNumber(output.value),
      })
    }
    return psbt
  }

  async serializePaymentTx(tx: bitcoinish.BitcoinishPaymentTx, fromIndex: number): Promise<string> {
    return (await this.buildPsbt(tx, fromIndex)).toHex()
  }

  validateAndFinalizeSignedTx(
    tx: DogeSignedTransaction | DogeUnsignedTransaction,
    psbt: bitcoin.Psbt,
  ): DogeSignedTransaction {
    if (!psbt.validateSignaturesOfAllInputs()) {
      throw new Error('Failed to validate signatures of all inputs')
    }
    psbt.finalizeAllInputs()
    const signedTx = psbt.extractTransaction()
    const txId = signedTx.getId()
    const txHex = signedTx.toHex()
    const txData = tx.data
    const unsignedTxHash = DogeSignedTransactionData.is(txData) ? txData.unsignedTxHash : txData.rawHash
    return {
      ...tx,
      status: TransactionStatus.Signed,
      id: txId,
      data: {
        hex: txHex,
        partial: false,
        unsignedTxHash,
        changeOutputs: tx.data?.changeOutputs
      },
    }
  }

  getSupportedAddressTypes(): AddressType[] {
    return [AddressType.Legacy]
  }

  updateSignedMultisigTx(
    tx: DogeSignedTransaction | DogeUnsignedTransaction,
    psbt: bitcoin.Psbt,
    updatedMultisigData: MultisigData,
  ): DogeSignedTransaction {
    if (isMultisigFullySigned(updatedMultisigData)) {
      const finalizedTx =  this.validateAndFinalizeSignedTx(tx, psbt)
      return {
        ...finalizedTx,
        multisigData: updatedMultisigData,
      }
    }
    const combinedHex = psbt.toHex()
    const unsignedTxHash = DogeSignedTransactionData.is(tx.data) ? tx.data.unsignedTxHash : tx.data.rawHash
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
      }
    }
  }

  private validatePsbtBigintOutput(output: BitcoinishTxOutput, psbtOutput: PsbtTxOutput, i: number) {
    if (output.address !== psbtOutput.address) {
      throw new Error(
        `Invalid tx: psbt output ${i} address (${psbtOutput.address}) doesn't match expected address ${output.address}`,
      )
    }
    const value = this.toMainDenomination(new BigNumber(psbtOutput.value.toString()))
    if (output.value !== value) {
      throw new Error(`Invalid tx: psbt output ${i} value (${value}) doesn't match expected value (${output.value})`)
    }
  }

  private validatePsbtBigintInput(input: UtxoInfo, psbtInput: PsbtTxInput, i: number) {
    // bitcoinjs psbt input hash buffer is reversed
    const hash = Buffer.from(psbtInput.hash)
      .reverse()
      .toString('hex')
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
  validatePsbtBigint(tx: BitcoinishUnsignedTransaction, psbt: bitcoin.Psbt) {
    const { data, externalOutputs, inputUtxos } = tx
    const psbtOutputs = psbt.txOutputs as PsbtTxOutput[]
    const psbtInputs = psbt.txInputs as PsbtTxInput[]

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
      this.validatePsbtBigintInput(inputUtxos[i], psbtInput, i)
      this.validatePsbtBigintInput(data.inputs[i], psbtInput, i)
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
        this.validatePsbtBigintOutput(externalOutputs[i], psbtOutput, i)
        this.validatePsbtBigintOutput(data.externalOutputs[i], psbtOutput, i)
        externalOutputTotal = externalOutputTotal.plus(data.externalOutputs[i].value)
      } else {
        const changeOutputIndex = i - externalOutputs.length
        const changeOutput = data.changeOutputs[changeOutputIndex]
        this.validatePsbtBigintOutput(changeOutput, psbtOutput, i)

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
