import * as bitcoin from 'bitcoinjs-lib-bigint'
import { UtxoInfo } from '@bitaccess/coinlib-common'
import { AddressType, bitcoinish } from '@bitaccess/coinlib-bitcoin'

import { toBitcoinishConfig } from './utils'
import {
  BaseDogePaymentsConfig,
  PsbtInputData,
} from './types'
import { BITCOIN_SEQUENCE_RBF, DEFAULT_FEE_LEVEL_BLOCK_TARGETS } from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey, standardizeAddress, estimateDogeTxSize } from './helpers'

// tslint:disable-next-line:max-line-length
export abstract class BaseDogePayments<Config extends BaseDogePaymentsConfig> extends bitcoinish.BitcoinishPayments<
  Config
> {
  readonly maximumFeeRate?: number

  constructor(config: BaseDogePaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
    this.feeLevelBlockTargets = config.feeLevelBlockTargets ?? DEFAULT_FEE_LEVEL_BLOCK_TARGETS
  }

  abstract addressType: AddressType
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
    return this.addressType
  }

  estimateTxSize(inputCount: number, changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateDogeTxSize(
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
      psbt.addInput(await this.getPsbtInputData(input, this.getPaymentScript(signer), this.addressType))
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
}
