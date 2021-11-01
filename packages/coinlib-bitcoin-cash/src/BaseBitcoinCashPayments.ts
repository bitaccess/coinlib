import * as bitcoin from 'bitcoinforksjs-lib'
import bchAddr from 'bchaddrjs'
import { bitcoinish, AddressType } from '@bitaccess/coinlib-bitcoin'
import {
  FeeRate, AutoFeeLevels, UtxoInfo, TransactionStatus,
} from '@bitaccess/coinlib-common'
import { toBitcoinishConfig } from './utils'
import {
  BaseBitcoinCashPaymentsConfig,
  BitcoinCashUnsignedTransaction,
  BitcoinCashSignedTransactionData,
  BitcoinCashSignedTransaction,
  PsbtInputData,
  BitcoinCashAddressFormat,
} from './types'
import {
  BITCOIN_SEQUENCE_RBF, SINGLESIG_ADDRESS_TYPE,
} from './constants'
import { estimateBitcoinCashTxSize } from './helpers'
import { BitcoinCashPaymentsUtils } from './BitcoinCashPaymentsUtils'

export abstract class BaseBitcoinCashPayments<Config extends BaseBitcoinCashPaymentsConfig>
  extends bitcoinish.BitcoinishPayments<Config> {

  readonly maximumFeeRate?: number
  readonly validAddressFormat?: BitcoinCashAddressFormat
  readonly utils: BitcoinCashPaymentsUtils
  readonly addressType: AddressType

  constructor(config: BaseBitcoinCashPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
    this.validAddressFormat = config.validAddressFormat
    this.utils = new BitcoinCashPaymentsUtils(config)
    this.addressType = AddressType.Legacy
  }

  abstract getPaymentScript(index: number): bitcoin.payments.Payment

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
    return AddressType.Legacy
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateBitcoinCashTxSize(
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
  ): Promise<PsbtInputData> {
    const txHex = utxo.txHex ?? (await this.getApi().getTx(utxo.txid)).hex
    if (!txHex) {
      throw new Error(`Cannot get raw hex of tx for utxo ${utxo.txid}:${utxo.vout}`)
    }
    const result: PsbtInputData = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: BITCOIN_SEQUENCE_RBF,
      nonWitnessUtxo: Buffer.from(txHex, 'hex')
    }
    return result
  }

  get psbtOptions() {
    return {
      network: this.bitcoinjsNetwork,
      maximumFeeRate: this.maximumFeeRate,
    }
  }

  async buildPsbt(
    paymentTx: bitcoinish.BitcoinishPaymentTx,
    fromIndex?: number,
  ): Promise<bitcoin.Psbt> {
    const { inputs, outputs } = paymentTx
    const psbt = new bitcoin.Psbt(this.psbtOptions)
    const hashType = bitcoin.Transaction.SIGHASH_ALL | bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143

    for (const input of inputs) {
      const signer = input.signer ?? fromIndex
      if (typeof signer === 'undefined') {
        throw new Error('Signer index for utxo is not provided')
      }
      psbt.addInput({
        ...await this.getPsbtInputData(
          input,
        ),
        sighashType: hashType
      })
    }
    for (const output of outputs) {
      psbt.addOutput({
        address: bchAddr.toLegacyAddress(output.address),
        value: this.toBaseDenominationNumber(output.value)
      })
    }
    return psbt
  }

  async serializePaymentTx(
    tx: bitcoinish.BitcoinishPaymentTx,
    fromIndex?: number,
  ): Promise<string> {
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

  getSupportedAddressTypes(): AddressType[] {
    return [this.addressType]
  }
}
