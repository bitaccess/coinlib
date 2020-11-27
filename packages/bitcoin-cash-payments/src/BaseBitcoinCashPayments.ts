import * as bitcoin from 'bitcoinforksjs-lib'
import bchAddr from 'bchaddrjs'
import {
  FeeRateType, FeeRate, AutoFeeLevels, UtxoInfo, TransactionStatus,
} from '@faast/payments-common'
import { BitcoinCashPaymentsUtils } from '../src'
import { toBitcoinishConfig, estimateBitcoinTxSize } from './utils'
import {
  BaseBitcoinCashPaymentsConfig,
  BitcoinCashUnsignedTransaction,
  BitcoinCashSignedTransactionData,
  BitcoinCashSignedTransaction,
  AddressType,
  PsbtInputData,
} from './types'
import {
  DEFAULT_SAT_PER_BYTE_LEVELS, BITCOIN_SEQUENCE_RBF,
} from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey } from './helpers'
import { BitcoinishPayments, BitcoinishPaymentTx } from '@faast/bitcoin-payments'

// tslint:disable-next-line:max-line-length
export abstract class BaseBitcoinCashPayments<Config extends BaseBitcoinCashPaymentsConfig> extends BitcoinishPayments<Config> {

  readonly maximumFeeRate?: number

  constructor(config: BaseBitcoinCashPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
  }

  abstract getPaymentScript(index: number): bitcoin.payments.Payment
  abstract addressType: AddressType

  async createServiceTransaction(): Promise<null> {
    return null
  }

  isValidAddress(address: string): boolean {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

  isValidPublicKey(publicKey: string): boolean {
    return isValidPublicKey(publicKey, this.bitcoinjsNetwork)
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    let satPerByte: number
    try {
      satPerByte = await new BitcoinCashPaymentsUtils().getBlockBookFeeEstimate(feeLevel, this.networkType)
      this.logger.log(`Retrieved ${this.coinSymbol} ${this.networkType} fee rate of ${satPerByte} sat/vbyte from blockbook for ${feeLevel} level`)
    } catch (e) {
      throw new Error(`Failed to retrieve ${this.coinSymbol} ${this.networkType} fee rate from blockbook - ${e.toString()}`)
    }
    return {
      feeRate: satPerByte.toString(),
      feeRateType: FeeRateType.BasePerWeight,
    }
  }

  /** Return a string that can be passed into estimateBitcoinCashTxSize. Override to support multisig */
  getEstimateTxSizeInputKey(): string {
    return this.addressType
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    const outputCounts = externalOutputAddresses.reduce((outputCounts, address) => {
      // @ts-ignore
      outputCounts[address] = 1
      return outputCounts
    }, { [this.addressType]: changeOutputCount })
    return estimateBitcoinTxSize(
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
      sequence: BITCOIN_SEQUENCE_RBF,
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

  async buildPsbt(paymentTx: BitcoinishPaymentTx, fromIndex: number): Promise<bitcoin.Psbt> {
    const { inputs, outputs } = paymentTx
    const inputPaymentScript = this.getPaymentScript(fromIndex)
    let psbt = new bitcoin.Psbt(this.psbtOptions)
    const hashType = bitcoin.Transaction.SIGHASH_ALL | bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143
    for (let input of inputs) {
      psbt.addInput({
        ...await this.getPsbtInputData(
        input,
        inputPaymentScript,
        this.addressType,
        ),
        sighashType: hashType
      })
    }
    for (let output of outputs) {
      psbt.addOutput({
        address: bchAddr.toLegacyAddress(output.address),
        value: this.toBaseDenominationNumber(output.value)
      })
    }
    return psbt
  }

  async serializePaymentTx(tx: BitcoinishPaymentTx, fromIndex: number): Promise<string> {
    return (await this.buildPsbt(tx, fromIndex)).toHex()
  }

  validateAndFinalizeSignedTx(
    tx: BitcoinCashSignedTransaction | BitcoinCashUnsignedTransaction,
    psbt: bitcoin.Psbt,
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
      },
    }
  }
}
