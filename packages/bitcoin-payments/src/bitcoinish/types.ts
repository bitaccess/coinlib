import * as t from 'io-ts'
import {
  BaseUnsignedTransaction, BaseSignedTransaction, FeeRate, AutoFeeLevels,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, NetworkTypeT, ResolveablePayport,
} from '@faast/payments-common'
import { extendCodec, nullable, instanceofCodec, requiredOptionalCodec, Logger, Numeric } from '@faast/ts-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import { BlockbookBitcoin, BlockInfoBitcoin } from 'blockbook-client'

export { BitcoinjsNetwork }

/** A hack to get around TS2742 when config is re-exported from coin-payments */
export class BlockbookServerAPI extends BlockbookBitcoin {}

export const BlockbookConfigServer = t.union([
  t.string,
  t.array(t.string),
  instanceofCodec(BlockbookServerAPI),
  t.null,
], 'BlockbookConfigServer')
export type BlockbookConfigServer = t.TypeOf<typeof BlockbookConfigServer>

export const BlockbookConnectedConfig = requiredOptionalCodec(
  {
    network: NetworkTypeT,
    server: BlockbookConfigServer,
  },
  {
    logger: nullable(Logger),
  },
  'BlockbookConnectedConfig',
)
export type BlockbookConnectedConfig = t.TypeOf<typeof BlockbookConnectedConfig>

export type BitcoinishPaymentsUtilsConfig = BlockbookConnectedConfig & {
  coinSymbol: string,
  coinName: string,
  bitcoinjsNetwork: BitcoinjsNetwork,
  decimals: number,
}

export type BitcoinishPaymentsConfig = BitcoinishPaymentsUtilsConfig & {
  minTxFee: FeeRate,
  dustThreshold: number,
  networkMinRelayFee: number,
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
    // Outputs specified by transaction creator
    externalOutputs: t.array(BitcoinishTxOutput),
    // Total of external outputs in main denom
    externalOutputTotal: t.string,
    // Outputs returning to transaction creator
    changeOutputs: t.array(BitcoinishTxOutput),
    // Unsigned tx serialized as hex string (if implementation allows, empty string otherwise)
    rawHex: t.string,
    // sha256 hash of raw tx data
    rawHash: t.string,
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

export const BitcoinishTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinishTransactionInfo')
export type BitcoinishTransactionInfo = t.TypeOf<typeof BitcoinishTransactionInfo>

export const BitcoinishBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinishBroadcastResult')
export type BitcoinishBroadcastResult = t.TypeOf<typeof BitcoinishBroadcastResult>

export const BitcoinishBlock = BlockInfoBitcoin
export type BitcoinishBlock = BlockInfoBitcoin

export const PayportOutput = t.type({
  payport: ResolveablePayport,
  amount: Numeric,
}, 'PayportOutput')
export type PayportOutput = t.TypeOf<typeof PayportOutput>
