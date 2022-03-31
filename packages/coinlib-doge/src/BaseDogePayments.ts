// import * as bitcoin from 'bitcoinjs-lib-bigint'
import * as bitcoin from 'bitcoinjs-lib'
import { FeeRate, AutoFeeLevels, UtxoInfo, TransactionStatus, MultisigData } from '@bitaccess/coinlib-common'
import { AddressType, bitcoinish } from '@bitaccess/coinlib-bitcoin'

import { toBitcoinishConfig } from './utils'
import {
  BaseDogePaymentsConfig,
  DogeUnsignedTransaction,
  DogeSignedTransactionData,
  DogeSignedTransaction,
  PsbtInputData,
} from './types'
import { BITCOIN_SEQUENCE_RBF, DEFAULT_FEE_LEVEL_BLOCK_TARGETS, SINGLESIG_ADDRESS_TYPE } from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress, estimateDogeTxSize } from './helpers'
import { isMultisigFullySigned } from '@bitaccess/coinlib-bitcoin/src/bitcoinish'
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
        value: utxoValue,
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

}
