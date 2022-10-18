import * as bitcoin from 'bitcoinjs-lib-bigint'
import { UtxoInfo, NetworkType } from '@bitaccess/coinlib-common'

import { toBitcoinishConfig } from './utils'
import { BaseBitcoinPaymentsConfig, AddressType, AddressTypeT, PsbtInputData } from './types'
import { BITCOIN_SEQUENCE_RBF, DEFAULT_ADDRESS_TYPE, BITCOIN_NETWORK_CONSTANTS, NETWORKS } from './constants'
import {
  isValidAddress,
  isValidPrivateKey,
  isValidPublicKey,
  standardizeAddress,
  estimateBitcoinTxSize,
  isSupportedAddressType,
  getSupportedAddressTypes,
} from './helpers'
import {
  BitcoinishPayments,
  BitcoinishPaymentTx,
  countOccurences,
  createDeterminePathForIndexHelper,
  createDeriveUniPubKeyForPathHelper,
} from './bitcoinish'
import { assertType, isUndefined } from '@bitaccess/ts-common'

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

  estimateTxSize(inputUtxos: UtxoInfo[], changeOutputCount: number, externalOutputAddresses: string[]): number {
    return estimateBitcoinTxSize(
      countOccurences(this.getInputUtxoTxSizeEstimateKeys(inputUtxos)),
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
        value: BigInt(utxoValue),
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
      this.determinePathForIndexFn = createDeterminePathForIndexHelper(BITCOIN_NETWORK_CONSTANTS, functions)
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
      this.deriveUniPubKeyForPathFn = createDeriveUniPubKeyForPathHelper(constants)
    }
    const uniPubKey = this.deriveUniPubKeyForPathFn(seed, derivationPath)
    return uniPubKey
  }
}
