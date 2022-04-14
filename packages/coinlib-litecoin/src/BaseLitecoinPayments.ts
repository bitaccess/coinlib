import * as bitcoin from 'bitcoinjs-lib-bigint'
import {
  UtxoInfo,
  TransactionStatus,
  MultisigData,
} from '@bitaccess/coinlib-common'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'

import { toBitcoinishConfig } from './utils'
import {
  BaseLitecoinPaymentsConfig,
  LitecoinUnsignedTransaction,
  LitecoinSignedTransactionData,
  LitecoinSignedTransaction,
  AddressType,
  PsbtInputData,
  LitecoinAddressFormat,
} from './types'
import {
  DEFAULT_FEE_LEVEL_BLOCK_TARGETS,
  LITECOIN_SEQUENCE_RBF,
} from './constants'
import { estimateLitecoinTxSize } from './helpers'
import { isMultisigFullySigned } from '@bitaccess/coinlib-bitcoin/src/bitcoinish'

import { LitecoinPaymentsUtils } from './LitecoinPaymentsUtils'

export abstract class BaseLitecoinPayments<Config extends BaseLitecoinPaymentsConfig>
  extends bitcoinish.BitcoinishPayments<Config> {

  readonly maximumFeeRate?: number
  readonly validAddressFormat?: LitecoinAddressFormat
  readonly utils: LitecoinPaymentsUtils

  constructor(config: BaseLitecoinPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
    this.validAddressFormat = config.validAddressFormat
    this.feeLevelBlockTargets = config.feeLevelBlockTargets ?? DEFAULT_FEE_LEVEL_BLOCK_TARGETS
    this.utils = new LitecoinPaymentsUtils(config)
  }

  abstract getPaymentScript(index: number): bitcoin.payments.Payment
  abstract addressType: AddressType

  isValidAddress(address: string, options?: { format?: string }): boolean {
    return this.utils.isValidAddress(address, options)
  }

  standardizeAddress(address: string, options?: { format?: string }) {
    return this.utils.standardizeAddress(address, options)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return this.utils.isValidPrivateKey(privateKey)
  }

  isValidPublicKey(publicKey: string): boolean {
    return this.utils.isValidPublicKey(publicKey)
  }

  /** Return a string that can be passed into estimateLitecoinTxSize. Override to support multisig */
  getEstimateTxSizeInputKey(): string {
    return this.addressType
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateLitecoinTxSize(
      { [this.getEstimateTxSizeInputKey()]: inputCount },
      {
        ...bitcoinish.countOccurences(externalOutputAddresses),
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
    const utx = await this.getApi().getTx(utxo.txid)
    const result: PsbtInputData = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: LITECOIN_SEQUENCE_RBF,
    }
    if ((/p2wpkh|p2wsh/).test(addressType)) {
      // for segwit inputs, you only need the output script and value as an object.
      const rawUtxo = utx.vout[utxo.vout]
      const { hex: scriptPubKey, value: rawValue } = rawUtxo
      if (!scriptPubKey) {
        throw new Error(`Cannot get scriptPubKey for utxo ${utxo.txid}:${utxo.vout}`)
      }
      const utxoValue = this.toBaseDenominationNumber(utxo.value)
      if (String(utxoValue) !== rawValue) {
        throw new Error(`Utxo ${utxo.txid}:${utxo.vout} has mismatched value - ${utxoValue} sat expected but network reports ${rawValue} sat`)
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
        value: this.toBaseDenominationNumber(output.value)
      })
    }
    return psbt
  }

  async serializePaymentTx(tx: bitcoinish.BitcoinishPaymentTx, fromIndex: number): Promise<string> {
    return (await this.buildPsbt(tx, fromIndex)).toHex()
  }


  validateAndFinalizeSignedTx(
    tx: LitecoinSignedTransaction | LitecoinUnsignedTransaction,
    psbt: bitcoin.Psbt,
  ): LitecoinSignedTransaction {
    if (!psbt.validateSignaturesOfAllInputs()) {
      throw new Error('Failed to validate signatures of all inputs')
    }
    psbt.finalizeAllInputs()
    const signedTx = psbt.extractTransaction()
    const txId = signedTx.getId()
    const txHex = signedTx.toHex()
    const txData = tx.data
    const unsignedTxHash = LitecoinSignedTransactionData.is(txData) ? txData.unsignedTxHash : txData.rawHash
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


  updateSignedMultisigTx(
    tx: LitecoinSignedTransaction | LitecoinUnsignedTransaction,
    psbt: bitcoin.Psbt,
    updatedMultisigData: MultisigData,
  ): LitecoinSignedTransaction {
    if (isMultisigFullySigned(updatedMultisigData)) {
      const finalizedTx =  this.validateAndFinalizeSignedTx(tx, psbt)
      return {
        ...finalizedTx,
        multisigData: updatedMultisigData,
      }
    }
    const combinedHex = psbt.toHex()
    const unsignedTxHash = LitecoinSignedTransactionData.is(tx.data) ? tx.data.unsignedTxHash : tx.data.rawHash
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
