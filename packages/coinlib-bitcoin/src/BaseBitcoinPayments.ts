import * as bitcoin from 'bitcoinjs-lib'
import { UtxoInfo, TransactionStatus, MultisigData } from '@bitaccess/coinlib-common'

import { toBitcoinishConfig } from './utils'
import {
  BaseBitcoinPaymentsConfig,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransactionData,
  BitcoinSignedTransaction,
  AddressType,
  PsbtInputData,
} from './types'
import { BITCOIN_SEQUENCE_RBF } from './constants'
import {
  isValidAddress,
  isValidPrivateKey,
  isValidPublicKey,
  standardizeAddress,
  estimateBitcoinTxSize,
  isMultisigFullySigned,
} from './helpers'
import {
  BitcoinishPayments,
  BitcoinishPaymentTx,
  BitcoinishTxOutput,
  countOccurences,
  getBlockcypherFeeRecommendation,
} from './bitcoinish'

export abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinishPayments<Config> {
  readonly maximumFeeRate?: number
  readonly blockcypherToken?: string

  constructor(config: BaseBitcoinPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
    this.blockcypherToken = config.blockcypherToken
  }

  abstract getPaymentScript(index: number, addressType?: AddressType): bitcoin.payments.Payment
  abstract addressType: AddressType

  async createServiceTransaction(): Promise<null> {
    return null
  }

  isValidAddress(address: string): boolean {
    return isValidAddress(address, this.networkType)
  }

  standardizeAddress(address: string): string | null {
    return standardizeAddress(address, this.networkType)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return isValidPrivateKey(privateKey, this.networkType)
  }

  isValidPublicKey(publicKey: string): boolean {
    return isValidPublicKey(publicKey, this.networkType)
  }

  /** Return a string that can be passed into estimateBitcoinTxSize. Override to support multisig */
  getEstimateTxSizeInputKey(): string {
    return this.addressType
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateBitcoinTxSize(
      { [this.getEstimateTxSizeInputKey()]: inputCount },
      {
        ...countOccurences(externalOutputAddresses),
        [this.addressType]: changeOutputCount,
      },
      this.networkType,
    )
  }

  async getPsbtInputData(
    utxo: UtxoInfo,
    paymentScript: bitcoin.payments.Payment,
    addressType: AddressType,
  ): Promise<PsbtInputData> {
    const result: PsbtInputData = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: BITCOIN_SEQUENCE_RBF,
    }
    if (/p2wpkh|p2wsh/.test(addressType)) {
      // for segwit inputs, you only need the output script and value as an object.
      const scriptPubKey = utxo.scriptPubKeyHex ?? (await this.getApi().getTx(utxo.txid)).vout[utxo.vout]?.hex
      if (!scriptPubKey) {
        throw new Error(`Cannot get scriptPubKey for utxo ${utxo.txid}:${utxo.vout}`)
      }
      const utxoValue = this.toBaseDenominationNumber(utxo.value)
      result.witnessUtxo = {
        script: Buffer.from(scriptPubKey, 'hex'),
        value: utxoValue,
      }
    } else {
      // for non segwit inputs, you must pass the full transaction buffer
      const txHex = utxo.txHex ?? (await this.getApi().getTx(utxo.txid)).hex
      if (!txHex) {
        throw new Error(`Cannot get raw hex of tx for utxo ${utxo.txid}:${utxo.vout}`)
      }
      result.nonWitnessUtxo = Buffer.from(txHex, 'hex')
    }
    if (addressType.startsWith('p2sh-p2wsh')) {
      result.witnessScript = paymentScript.redeem!.redeem!.output
      result.redeemScript = paymentScript.redeem!.output
    } else if (addressType.startsWith('p2sh')) {
      result.redeemScript = paymentScript.redeem!.output
    } else if (addressType.startsWith('p2wsh')) {
      result.witnessScript = paymentScript.redeem!.output
    }
    return result
  }

  get psbtOptions() {
    return {
      network: this.bitcoinjsNetwork,
      maximumFeeRate: this.maximumFeeRate,
    }
  }

  async buildPsbt(paymentTx: BitcoinishPaymentTx, fromIndex?: number): Promise<bitcoin.Psbt> {
    const { inputs, outputs } = paymentTx

    const psbt = new bitcoin.Psbt(this.psbtOptions)
    for (const input of inputs) {
      const signer = input.signer ?? fromIndex
      if (typeof signer === 'undefined') {
        throw new Error('Signer index for utxo is not provided')
      }

      const addressType = this.getAddressType(input.address!, signer)
      psbt.addInput(await this.getPsbtInputData(input, this.getPaymentScript(signer, addressType), addressType))
    }
    for (const output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: this.toBaseDenominationNumber(output.value),
      })
    }
    return psbt
  }

  async serializePaymentTx(tx: BitcoinishPaymentTx, fromIndex?: number): Promise<string> {
    return (await this.buildPsbt(tx, fromIndex)).toHex()
  }

  validateAndFinalizeSignedTx(
    tx: BitcoinSignedTransaction | BitcoinUnsignedTransaction,
    psbt: bitcoin.Psbt,
  ): BitcoinSignedTransaction {
    if (!psbt.validateSignaturesOfAllInputs()) {
      throw new Error('Failed to validate signatures of all inputs')
    }
    psbt.finalizeAllInputs()
    const signedTx = psbt.extractTransaction()
    const txId = signedTx.getId()
    const txHex = signedTx.toHex()
    const txData = tx.data
    const unsignedTxHash = BitcoinSignedTransactionData.is(txData) ? txData.unsignedTxHash : txData.rawHash
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
    tx: BitcoinSignedTransaction | BitcoinUnsignedTransaction,
    psbt: bitcoin.Psbt,
    updatedMultisigData: MultisigData,
  ): BitcoinSignedTransaction {
    if (isMultisigFullySigned(updatedMultisigData)) {
      const finalizedTx = this.validateAndFinalizeSignedTx(tx, psbt)
      return {
        ...finalizedTx,
        multisigData: updatedMultisigData,
      }
    }
    const combinedHex = psbt.toHex()
    const unsignedTxHash = BitcoinSignedTransactionData.is(tx.data) ? tx.data.unsignedTxHash : tx.data.rawHash
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
}
