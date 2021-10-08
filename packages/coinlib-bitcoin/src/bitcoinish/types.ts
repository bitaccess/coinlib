import * as t from 'io-ts'
import {
  BaseUnsignedTransaction, BaseSignedTransaction, FeeRate, AutoFeeLevels,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, NetworkTypeT, FeeLevel,
} from '@bitaccess/coinlib-common'
import { extendCodec, nullable, instanceofCodec, requiredOptionalCodec, Logger, Numeric, enumCodec } from '@faast/ts-common'
import { Signer as BitcoinjsSigner } from 'bitcoinjs-lib'
import { BlockbookBitcoin, BlockInfoBitcoin, NormalizedTxBitcoin, NormalizedTxBitcoinVin, NormalizedTxBitcoinVout } from 'blockbook-client'
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'

export {
  BlockbookBitcoin,
  BlockInfoBitcoin,
  NormalizedTxBitcoin,
  NormalizedTxBitcoinVout,
  NormalizedTxBitcoinVin,
}

export type BitcoinjsKeyPair = BitcoinjsSigner & {
  privateKey?: Buffer
  toWIF(): string
}

export enum AddressType {
  Legacy = 'p2pkh',
  SegwitP2SH = 'p2sh-p2wpkh',
  SegwitNative = 'p2wpkh',
  MultisigLegacy = 'p2sh-p2ms',
  MultisigSegwitP2SH = 'p2sh-p2wsh-p2ms',
  MultisigSegwitNative = 'p2wsh-p2ms'
}
export const AddressTypeT = enumCodec<AddressType>(AddressType, 'AddressType')

// For unclear reasons tsc throws TS4023 when this type is used in an external module.
// Re-exporting the codec cast to the inferred type helps fix this.
const SinglesigAddressTypeT = t.keyof({
  [AddressType.Legacy]: null,
  [AddressType.SegwitP2SH]: null,
  [AddressType.SegwitNative]: null,
}, 'SinglesigAddressType')
export type SinglesigAddressType = t.TypeOf<typeof SinglesigAddressTypeT>
export const SinglesigAddressType = SinglesigAddressTypeT as t.Type<SinglesigAddressType>

const MultisigAddressTypeT = t.keyof({
  [AddressType.MultisigLegacy]: null,
  [AddressType.MultisigSegwitP2SH]: null,
  [AddressType.MultisigSegwitNative]: null,
}, 'MultisigAddressType')
export type MultisigAddressType = t.TypeOf<typeof MultisigAddressTypeT>
export const MultisigAddressType = MultisigAddressTypeT as t.Type<MultisigAddressType>

export const FeeLevelBlockTargets = t.record(AutoFeeLevels, t.number, 'FeeLevelBlockTargets')
export type FeeLevelBlockTargets = t.TypeOf<typeof FeeLevelBlockTargets>

/** A hack to get around TS2742 when config is re-exported from coin-payments */
export class BlockbookServerAPI extends BlockbookBitcoin {}

export const BlockbookConfigServer = t.union([
  t.string,
  t.array(t.string),
  t.null,
], 'BlockbookConfigServer')
export type BlockbookConfigServer = t.TypeOf<typeof BlockbookConfigServer>

export const BlockbookConnectedConfig = requiredOptionalCodec(
  {
    network: NetworkTypeT,
    packageName: t.string,
    server: BlockbookConfigServer,
  },
  {
    logger: nullable(Logger),
    api: instanceofCodec(BlockbookServerAPI),
    requestTimeoutMs: t.number,
  },
  'BlockbookConnectedConfig',
)
export type BlockbookConnectedConfig = t.TypeOf<typeof BlockbookConnectedConfig>

export const BitcoinjsNetwork = t.type({
  messagePrefix: t.string,
  bech32: t.string,
  bip32: t.type({
    public: t.number,
    private: t.number,
  }),
  pubKeyHash: t.number,
  scriptHash: t.number,
  wif: t.number,
}, 'BitcoinjsNetwork')
export type BitcoinjsNetwork = t.TypeOf<typeof BitcoinjsNetwork>

export const BitcoinishPaymentsUtilsConfig = extendCodec(
  BlockbookConnectedConfig,
  {
    coinSymbol: t.string,
    coinName: t.string,
    coinDecimals: t.number,
    bitcoinjsNetwork: BitcoinjsNetwork,
    networkMinRelayFee: t.number, // base denom
  },
  {
    blockcypherToken: t.string,
    feeLevelBlockTargets: FeeLevelBlockTargets,
  },
  'BitcoinishPaymentsUtilsConfig'
)
export type BitcoinishPaymentsUtilsConfig = t.TypeOf<typeof BitcoinishPaymentsUtilsConfig>

export type BitcoinishBalanceMonitorConfig = BlockbookConnectedConfig & {
  utils: BitcoinishPaymentsUtils,
}

export type BitcoinishPaymentsConfig = BitcoinishPaymentsUtilsConfig & {
  minTxFee: FeeRate,
  dustThreshold: number,
  defaultFeeLevel: AutoFeeLevels,
  targetUtxoPoolSize?: number, // # of available utxos to try and maintain
  minChange?: Numeric, // Soft minimum for each change generated to maintain utxo pool
}

export const BitcoinishTxOutput = t.type({
  address: t.string,
  value: t.string,
}, 'BitcoinishTxOutput')
export type BitcoinishTxOutput = t.TypeOf<typeof BitcoinishTxOutput>

export const BitcoinishTxOutputSatoshis = t.type({
  address: t.string,
  satoshis: t.number,
}, 'BitcoinishTxOutputSatoshis')
export type BitcoinishTxOutputSatoshis = t.TypeOf<typeof BitcoinishTxOutputSatoshis>

export const BitcoinishWeightedChangeOutput = t.type({
  address: t.string,
  weight: t.number,
}, 'BitcoinishWeightedChangeOutput')
export type BitcoinishWeightedChangeOutput = t.TypeOf<typeof BitcoinishWeightedChangeOutput>

/**
 * An object representing a Bitcoin like transaction (UTXO based) with inputs and outputs.
 *
 * The externalOutputs, changeOutputs, and hex fields are optional for back compat. Single change output
 * transactions use the changeAddress field. Multi change outputs transactions will leave
 * changeAddress null.
 */
export const BitcoinishPaymentTx = requiredOptionalCodec(
  {
    inputs: t.array(UtxoInfo),
    // All external and change outputs
    outputs: t.array(BitcoinishTxOutput),
    fee: t.string,
    change: t.string,
    changeAddress: nullable(t.string),
  },
  {
    // Total value of input utxos in main denom
    inputTotal: t.string,
    // Outputs specified by transaction creator
    externalOutputs: t.array(BitcoinishTxOutput),
    // Total value of external outputs in main denom
    externalOutputTotal: t.string,
    // Outputs returning to transaction creator
    changeOutputs: t.array(BitcoinishTxOutput),
    // Unsigned tx serialized as hex string (if implementation allows, empty string otherwise)
    rawHex: t.string,
    // sha256 hash of raw tx data
    rawHash: t.string,
    // weight of transaction for fee purposes (ie vbytes, gas limit)
    weight: t.number,
  },
  'BitcoinishPaymentTx'
)
export type BitcoinishPaymentTx = t.TypeOf<typeof BitcoinishPaymentTx>

export const BitcoinishUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: BitcoinishPaymentTx,
  },
  'BitcoinishUnsignedTransaction',
)
export type BitcoinishUnsignedTransaction = t.TypeOf<typeof BitcoinishUnsignedTransaction>

export const BitcoinishSignedTransaction = extendCodec(BaseSignedTransaction, {
  data: t.type({
    hex: t.string,
  }),
}, {}, 'BitcoinishSignedTransaction')
export type BitcoinishSignedTransaction = t.TypeOf<typeof BitcoinishSignedTransaction>

export const BitcoinishTransactionInfo = extendCodec(BaseTransactionInfo, {
  data: NormalizedTxBitcoin,
}, {}, 'BitcoinishTransactionInfo')
export type BitcoinishTransactionInfo = t.TypeOf<typeof BitcoinishTransactionInfo>

export const BitcoinishBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinishBroadcastResult')
export type BitcoinishBroadcastResult = t.TypeOf<typeof BitcoinishBroadcastResult>

export const BitcoinishBlock = BlockInfoBitcoin
export type BitcoinishBlock = BlockInfoBitcoin

export type UtxoInfoWithSats = UtxoInfo & { satoshis: number }

export type BitcoinishTxBuildContext = {
  /** Utxos not already used by pending transactions */
  readonly unusedUtxos: UtxoInfoWithSats[],
  /** Utxos we must select from in order to RBF */
  readonly enforcedUtxos: UtxoInfoWithSats[],
  /** External outputs the creator desires excluding change (amounts may end up lower if recipientPaysFee is enabled) */
  readonly desiredOutputs: BitcoinishTxOutput[],
  /** Addresses to send all change outputs to */
  readonly changeAddress: string[],
  /** Fee rate creator wants (may differ in reality because we can only estimate this) */
  readonly desiredFeeRate: FeeRate,
  /** true if every utxo should be included (ie sweeping or consolidating utxos) */
  readonly useAllUtxos: boolean,
  /** true if unconfirmed utxos should be used */
  readonly useUnconfirmedUtxos: boolean,
  /** true if fee should be deducted from outputs instead of paid by sender */
  readonly recipientPaysFee: boolean,
  /** Maximum fee as percent of desired output total */
  readonly maxFeePercent: number,
  /** All unused utxos that aren't too small to be spent */
  readonly nonDustUtxoCount: number,
  /** Utxos we can select from (ie unusedUtxos less dust, and possibly unconfirmed) */
  readonly selectableUtxos: UtxoInfoWithSats[],

  /** Sum of desiredOutputs value in satoshis */
  desiredOutputTotal: number,

  /** Mutable version of desiredOutputs with amounts in satoshis for convenient math. */
  externalOutputs: BitcoinishTxOutputSatoshis[],

  /** Sum of externalOutputs value in satoshis */
  externalOutputTotal: number,

  /** Addresses of externalOutputs */
  externalOutputAddresses: string[],

  /** true if tx uses all utxos and has no change outputs */
  isSweep: boolean,

  /** Utxos selected as inputs for the tx */
  inputUtxos: UtxoInfoWithSats[],

  /** Sum of inputUtxos value in satoshis */
  inputTotal: number,

  /** Total tx fee in satoshis */
  feeSat: number,

  /** Total change in satoshis */
  totalChange: number,

  /** Change outputs with amounts in satoshis */
  changeOutputs: BitcoinishTxOutputSatoshis[]
}

export type BitcoinishBuildPaymentTxParams = Pick<
  BitcoinishTxBuildContext,
  'desiredOutputs' | 'desiredFeeRate' | 'useAllUtxos' | 'useUnconfirmedUtxos' | 'recipientPaysFee' | 'maxFeePercent'
> & {
  unusedUtxos: UtxoInfo[],
  enforcedUtxos: UtxoInfo[],
  changeAddress: string[],
}
