import * as bitcoin from 'bitcoinjs-lib'
import {
  FeeRate,
  AutoFeeLevels,
  UtxoInfo,
  TransactionStatus,
  BaseMultisigData,
} from '@faast/payments-common'
import { bitcoinish } from '@faast/bitcoin-payments'

import { toBitcoinishConfig } from './utils'
import {
  BaseLitecoinPaymentsConfig,
  LitecoinUnsignedTransaction,
  LitecoinSignedTransactionData,
  LitecoinSignedTransaction,
  AddressType,
  PsbtInputData,
} from './types'
import {
  LITECOIN_SEQUENCE_RBF,
} from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress, estimateLitecoinTxSize } from './helpers'

export abstract class BaseLitecoinPayments<Config extends BaseLitecoinPaymentsConfig>
  extends bitcoinish.BitcoinishPayments<Config> {

  readonly maximumFeeRate?: number
  readonly blockcypherToken?: string

  constructor(config: BaseLitecoinPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
    this.blockcypherToken = config.blockcypherToken
  }

  abstract getPaymentScript(index: number): bitcoin.payments.Payment
  abstract addressType: AddressType

  isValidAddress(address: string, options?: { format?: string }): boolean {
    return isValidAddress(address, this.networkType, options)
  }

  standardizeAddress(address: string, options?: { format?: string }) {
    return standardizeAddress(address, this.networkType, options)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return isValidPrivateKey(privateKey, this.networkType)
  }

  isValidPublicKey(publicKey: string): boolean {
    return isValidPublicKey(publicKey, this.networkType)
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    return bitcoinish.getBlockcypherFeeRecommendation(
      feeLevel, this.coinSymbol, this.networkType, this.blockcypherToken, this.logger,
    )
  }

  /** Return a string that can be passed into estimateLitecoinTxSize. Override to support multisig */
  getEstimateTxSizeInputKey(): string {
    return this.addressType
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    const outputCounts = externalOutputAddresses.reduce((outputCounts, address) => {
      outputCounts[address] = 1
      return outputCounts
    }, { [this.addressType]: changeOutputCount })
    return estimateLitecoinTxSize(
      { [this.getEstimateTxSizeInputKey()]: inputCount },
      outputCounts,
      this.bitcoinjsNetwork,
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

  async buildPsbt(paymentTx: bitcoinish.BitcoinishPaymentTx, fromIndex: number): Promise<bitcoin.Psbt> {
    const { inputs, outputs } = paymentTx
    const inputPaymentScript = this.getPaymentScript(fromIndex)

    let psbt = new bitcoin.Psbt(this.psbtOptions)
    for (let input of inputs) {
      psbt.addInput(await this.getPsbtInputData(
        input,
        inputPaymentScript,
        this.addressType,
      ))
    }
    for (let output of outputs) {
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
      },
    }
  }

  updateMultisigTx(
    tx: LitecoinSignedTransaction | LitecoinUnsignedTransaction,
    psbt: bitcoin.Psbt,
    signedAccountIds: string[],
  ): LitecoinSignedTransaction {
    const multisigData = tx.multisigData!
    const combinedMultisigData: BaseMultisigData = {
      ...multisigData,
      signedAccountIds: [...signedAccountIds.values()]
    }
    if (signedAccountIds.length >= multisigData.m) {
      const finalizedTx =  this.validateAndFinalizeSignedTx(tx, psbt)
      return {
        ...finalizedTx,
        multisigData: combinedMultisigData,
      }
    }
    const combinedHex = psbt.toHex()
    const unsignedTxHash = LitecoinSignedTransactionData.is(tx.data) ? tx.data.unsignedTxHash : tx.data.rawHash
    return {
      ...tx,
      id: '',
      status: TransactionStatus.Signed,
      multisigData: combinedMultisigData,
      data: {
        hex: combinedHex,
        partial: true,
        unsignedTxHash,
      }
    }
  }
}
