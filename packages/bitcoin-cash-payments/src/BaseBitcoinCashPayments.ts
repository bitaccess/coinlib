import * as bitcoin from 'bitcoinforksjs-lib'
import bchAddr from 'bchaddrjs'
import { bitcoinish, AddressType } from '@faast/bitcoin-payments'
import {
  FeeRate, AutoFeeLevels, UtxoInfo, TransactionStatus,
} from '@faast/payments-common'
import { toBitcoinishConfig } from './utils'
import {
  BaseBitcoinCashPaymentsConfig,
  BitcoinCashUnsignedTransaction,
  BitcoinCashSignedTransactionData,
  BitcoinCashSignedTransaction,
  PsbtInputData,
} from './types'
import {
  BITCOIN_SEQUENCE_RBF,
} from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress, estimateBitcoinCashTxSize } from './helpers'

// tslint:disable-next-line:max-line-length
export abstract class BaseBitcoinCashPayments<Config extends BaseBitcoinCashPaymentsConfig> extends bitcoinish.BitcoinishPayments<Config> {

  readonly maximumFeeRate?: number

  constructor(config: BaseBitcoinCashPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
  }

  abstract getPaymentScript(index: number): bitcoin.payments.Payment

  async createServiceTransaction(): Promise<null> {
    return null
  }

  isValidAddress(address: string, options?: { format?: string }): boolean {
    return isValidAddress(address, this.networkType, options)
  }

  standardizeAddress(address: string, options?: { format?: string }): string | null {
    return standardizeAddress(address, this.networkType, options)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return isValidPrivateKey(privateKey, this.networkType)
  }

  isValidPublicKey(publicKey: string): boolean {
    return isValidPublicKey(publicKey, this.networkType)
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    return bitcoinish.getBlockbookFeeRecommendation(
      feeLevel,
      this.coinSymbol,
      this.networkType,
      this.getApi(),
      this.logger,
    )
  }

  /** Return a string that can be passed into estimateBitcoinCashTxSize. Override to support multisig */
  getEstimateTxSizeInputKey(): string {
    return AddressType.Legacy
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    const outputCounts = externalOutputAddresses.reduce((outputCounts, address) => {
      // @ts-ignore
      outputCounts[address] = 1
      return outputCounts
    }, { [AddressType.Legacy]: changeOutputCount })
    return estimateBitcoinCashTxSize(
      { [this.getEstimateTxSizeInputKey()]: inputCount },
      outputCounts,
      this.networkType,
    )
  }

  async getPsbtInputData(
    utxo: UtxoInfo,
    paymentScript: bitcoin.payments.Payment,
    addressType: AddressType = AddressType.Legacy,
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

  async buildPsbt(paymentTx: bitcoinish.BitcoinishPaymentTx, fromIndex: number): Promise<bitcoin.Psbt> {
    const { inputs, outputs } = paymentTx
    const inputPaymentScript = this.getPaymentScript(fromIndex)
    let psbt = new bitcoin.Psbt(this.psbtOptions)
    const hashType = bitcoin.Transaction.SIGHASH_ALL | bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143
    for (let input of inputs) {
      psbt.addInput({
        ...await this.getPsbtInputData(
          input,
          inputPaymentScript,
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

  async serializePaymentTx(tx: bitcoinish.BitcoinishPaymentTx, fromIndex: number): Promise<string> {
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
