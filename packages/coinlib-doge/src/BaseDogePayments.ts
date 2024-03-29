import * as bitcoin from 'bitcoinjs-lib-bigint'
import { UtxoInfo, NetworkType } from '@bitaccess/coinlib-common'
import { AddressType, AddressTypeT, bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { assertType } from '@bitaccess/ts-common'
import { toBitcoinishConfig } from './utils'
import { BaseDogePaymentsConfig, PsbtInputData } from './types'
import {
  BITCOIN_SEQUENCE_RBF,
  DEFAULT_FEE_LEVEL_BLOCK_TARGETS,
  DEFAULT_ADDRESS_TYPE,
  NETWORKS,
  DOGE_NETWORK_CONSTANTS,
} from './constants'
import {
  isValidAddress,
  isValidPrivateKey,
  isValidPublicKey,
  standardizeAddress,
  estimateDogeTxSize,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'

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

  estimateTxSize(inputUtxos: UtxoInfo[], changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateDogeTxSize(
      bitcoinish.countOccurences(this.getInputUtxoTxSizeEstimateKeys(inputUtxos)),
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

  isSupportedAddressType(addressType: string): boolean {
    return isSupportedAddressType(addressType)
  }

  getSupportedAddressTypes(): AddressType[] {
    return getSupportedAddressTypes()
  }

  determinePathForIndex(accountIndex: number, options?: { addressType?: string }): string {
    const addressType = options?.addressType ? assertType(AddressTypeT, options?.addressType) : DEFAULT_ADDRESS_TYPE
    const networkType: NetworkType = this.networkType
    if (!this.determinePathForIndexFn) {
      const functions = {
        isSupportedAddressType,
      }
      this.determinePathForIndexFn = bitcoinish.createDeterminePathForIndexHelper(DOGE_NETWORK_CONSTANTS, functions)
    }
    const derivationPath: string = this.determinePathForIndexFn(accountIndex, addressType, networkType)
    return derivationPath
  }

  deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
    if (!this.deriveUniPubKeyForPathFn) {
      const constants = {
        networks: NETWORKS,
        networkType: this.networkType,
      }
      this.deriveUniPubKeyForPathFn = bitcoinish.createDeriveUniPubKeyForPathHelper(constants)
    }
    const uniPubKey = this.deriveUniPubKeyForPathFn(seed, derivationPath)
    return uniPubKey
  }
}
