import { Psbt } from 'bitcoinjs-lib'
import {
  FeeRateType, FeeRate, AutoFeeLevels, UtxoInfo
} from '@faast/payments-common'

import { getBlockcypherFeeEstimate, toBitcoinishConfig } from './utils'
import {
  BaseBitcoinPaymentsConfig,
  BitcoinSignedTransaction,
} from './types'
import {
  DEFAULT_SAT_PER_BYTE_LEVELS,
} from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey } from './helpers'
import { BitcoinishPayments } from './bitcoinish'

export abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinishPayments<Config> {
  readonly maximumFeeRate?: number

  constructor(config: BaseBitcoinPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
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

  async getPsbtInputData(
    utxo: UtxoInfo,
    payment: any,
    isSegwit: boolean,
    redeemType?: 'p2sh' | 'p2wsh' | 'p2sh-p2wsh',
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
    switch (redeemType) {
      case 'p2sh':
        result.redeemScript = payment.redeem.output;
        break;
      case 'p2wsh':
        result.witnessScript = payment.redeem.output;
        break;
      case 'p2sh-p2wsh':
        result.witnessScript = payment.redeem.redeem.output;
        result.redeemScript = payment.redeem.output;
        break;
    }
    return result
  }

  get psbtOptions() {
    return {
      network: this.bitcoinjsNetwork,
      maximumFeeRate: this.maximumFeeRate,
    }
  }

  decodePsbt(tx: BitcoinSignedTransaction): Psbt {
    const hex = tx.data.partial ? tx.data.hex : tx.data.psbt
    if (!hex) {
      throw new Error('Cannot decode finalized tx without psbt data')
    }
    return Psbt.fromHex(hex, this.psbtOptions)
  }

}
