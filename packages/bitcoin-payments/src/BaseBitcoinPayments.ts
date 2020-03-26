import { payments as bjsPayments, Psbt, ECPairInterface as ECPair } from 'bitcoinjs-lib'
import {
  NetworkType, FeeRateType, FeeRate, TransactionStatus, AutoFeeLevels, UtxoInfo
} from '@faast/payments-common'

import { getBlockcypherFeeEstimate, toBitcoinishConfig } from './utils'
import {
  BaseBitcoinPaymentsConfig, BitcoinishUnsignedTransaction, BitcoinishPaymentTx,
  BitcoinishSignedTransaction, AddressType, KeyPair,
} from './types'
import {
  DEFAULT_SAT_PER_BYTE_LEVELS, DEFAULT_ADDRESS_TYPE,
} from './constants'
import { toBaseDenominationNumber, isValidAddress, isValidPrivateKey, isValidPublicKey } from './helpers'
import { BitcoinishPayments } from './bitcoinish'

export abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinishPayments<Config> {
  readonly addressType: AddressType
  readonly maximumFeeRate?: number

  constructor(config: BaseBitcoinPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.addressType = config.addressType || DEFAULT_ADDRESS_TYPE
    this.maximumFeeRate = config.maximumFeeRate
  }

  abstract getKeyPair(index: number): KeyPair

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
      satPerByte = await getBlockcypherFeeEstimate(feeLevel, this.networkType)
    } catch (e) {
      satPerByte = DEFAULT_SAT_PER_BYTE_LEVELS[feeLevel]
      this.logger.warn(
        `Failed to get bitcoin ${this.networkType} fee estimate, using hardcoded default of ${feeLevel} sat/byte -- ${e.message}`
      )
    }
    return {
      feeRate: satPerByte.toString(),
      feeRateType: FeeRateType.BasePerWeight,
    }
  }

  async getInputData(
    utxo: UtxoInfo,
    payment: any,
    isSegwit: boolean,
    addressType: AddressType,
  ): Promise<any> {
    const utx = await this.getApi().getTx(utxo.txid)
    const result: any = {
      hash: utxo.txid,
      index: utxo.vout,
    }
    if (isSegwit) {
      // for segwit inputs, you only need the output script and value as an object.
      const rawUtxo = utx.vout[utxo.vout]
      const { hex: scriptPubKey } = rawUtxo
      if (!scriptPubKey) {
        throw new Error(`Cannot get scriptPubKey for utxo ${utxo.txid}:${utxo.vout}`)
      }
      const utxoValue = this.toBaseDenominationNumber(utxo.value)
      if (String(utxoValue) !== rawUtxo.value) {
        throw new Error(`Utxo ${utxo.txid}:${utxo.vout} has mismatched value - ${utxoValue} sat expected but network reports ${rawUtxo.value} sat`)
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
    if (addressType === AddressType.SegwitP2SH) {
      result.redeemScript = payment.redeem.output
    }
    return result
  }

  async buildPsbt(tx: BitcoinishUnsignedTransaction, keyPair: KeyPair): Promise<Psbt> {
    const { inputs, outputs } = tx.data as BitcoinishPaymentTx

    const bjsPaymentParams = { pubkey: keyPair.publicKey, network: this.bitcoinjsNetwork }
    let bjsPayment
    if (this.addressType === AddressType.Legacy) {
      bjsPayment = bjsPayments.p2pkh(bjsPaymentParams)
    } else if (this.addressType === AddressType.SegwitP2SH) {
      bjsPayment = bjsPayments.p2sh({
        redeem: bjsPayments.p2wpkh(bjsPaymentParams),
        network: this.bitcoinjsNetwork,
      })
    } else if (this.addressType === AddressType.SegwitNative) {
      bjsPayment = bjsPayments.p2wpkh(bjsPaymentParams)
    } else {
      throw new Error(`Unsupported AddressType ${this.addressType}`)
    }

    let psbt = new Psbt({
      network: this.bitcoinjsNetwork,
      maximumFeeRate: this.maximumFeeRate,
    })
    for (let input of inputs) {
      psbt.addInput(await this.getInputData(input, bjsPayment, this.isSegwit, this.addressType))
    }
    for (let output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: toBaseDenominationNumber(output.value)
      })
    }
    return psbt
  }

  async signTransaction(tx: BitcoinishUnsignedTransaction): Promise<BitcoinishSignedTransaction> {
    const keyPair = this.getKeyPair(tx.fromIndex)
    const psbt = await this.buildPsbt(tx, keyPair)

    await psbt.signAllInputsAsync(keyPair)

    if (!psbt.validateSignaturesOfAllInputs()) {
      throw new Error('Failed to validate signatures of all inputs')
    }
    psbt.finalizeAllInputs()
    const signedTx = psbt.extractTransaction()
    const txId = signedTx.getId()
    const txHex = signedTx.toHex()
    return {
      ...tx,
      status: TransactionStatus.Signed,
      id: txId,
      data: {
        hex: txHex,
      },
    }
  }
}
