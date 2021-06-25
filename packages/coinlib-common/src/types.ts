import * as t from 'io-ts'
import {
  requiredOptionalCodec,
  extendCodec,
  enumCodec,
  nullable,
  DateT,
  Logger,
  functionT,
  Numeric,
  optional,
} from '@faast/ts-common'

export type MaybePromise<T> = Promise<T> | T

export const NullableOptionalString = t.union([t.string, t.null, t.undefined])
export type NullableOptionalString = t.TypeOf<typeof NullableOptionalString>

export enum NetworkType {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
}
export const NetworkTypeT = enumCodec<NetworkType>(NetworkType, 'NetworkType')

export const BaseConfig = t.partial(
  {
    network: NetworkTypeT,
    logger: Logger,
  },
  'BaseConfig',
)
export type BaseConfig = t.TypeOf<typeof BaseConfig>

export const KeyPairsConfigParam = t.union([
  t.array(NullableOptionalString),
  t.record(t.number, NullableOptionalString)
], 'KeyPairsConfigParam')
export type KeyPairsConfigParam = t.TypeOf<typeof KeyPairsConfigParam>

export const Payport = requiredOptionalCodec(
  {
    address: t.string,
  },
  {
    extraId: nullable(t.string),
    signerAddress: t.string,
  },
  'Payport',
)
export type Payport = t.TypeOf<typeof Payport>

export const DerivablePayport = requiredOptionalCodec(
  {
    index: t.number
  },
  {
    addressType: t.string // enum for each coin payments
  },
  'DerivablePayport'
)
export type DerivablePayport = t.TypeOf<typeof DerivablePayport>

export const ResolveablePayport = t.union([Payport, DerivablePayport, t.string, t.number], 'ResolveablePayport')
export type ResolveablePayport = t.TypeOf<typeof ResolveablePayport>

export const PayportOutput = t.type({
  payport: ResolveablePayport,
  amount: Numeric,
}, 'PayportOutput')
export type PayportOutput = t.TypeOf<typeof PayportOutput>

export enum FeeLevel {
  Custom = 'custom',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}
export const FeeLevelT = enumCodec<FeeLevel>(FeeLevel, 'FeeLevel')

export const AutoFeeLevels = t.union([
  t.literal(FeeLevel.Low),
  t.literal(FeeLevel.Medium),
  t.literal(FeeLevel.High),
], 'AutoFeeLevels')
export type AutoFeeLevels = t.TypeOf<typeof AutoFeeLevels>

export enum FeeRateType {
  Main = 'main', // ie bitcoins, ethers
  Base = 'base', // ie satoshis, wei
  BasePerWeight = 'base/weight', // ie satoshis per byte, gas price (wei per gas)
}
export const FeeRateTypeT = enumCodec<FeeRateType>(FeeRateType, 'FeeRateType')

export const FeeRate = t.type({
  feeRate: t.string,
  feeRateType: FeeRateTypeT,
}, 'FeeRate')
export type FeeRate = t.TypeOf<typeof FeeRate>

export const FeeOptionCustom = extendCodec(
  FeeRate,
  {},
  {
    feeLevel: t.literal(FeeLevel.Custom),
  },
  'FeeOptionCustom',
)
export type FeeOptionCustom = t.TypeOf<typeof FeeOptionCustom>

export const FeeOptionLevel = t.partial(
  {
    feeLevel: t.union([t.literal(FeeLevel.High), t.literal(FeeLevel.Medium), t.literal(FeeLevel.Low)]),
  },
  'FeeOptionLevel',
)
export type FeeOptionLevel = t.TypeOf<typeof FeeOptionLevel>

export const FeeOption = t.union([FeeOptionCustom, FeeOptionLevel], 'FeeOption')
export type FeeOption = t.TypeOf<typeof FeeOption>

export const UtxoInfo = requiredOptionalCodec(
  {
    txid: t.string,
    vout: t.number,
    value: t.string, // main denomination
  },
  {
    satoshis: t.union([t.number, t.string]),
    confirmations: t.number,
    height: t.string,
    lockTime: t.string,
    coinbase: t.boolean,
    txHex: t.string,
    scriptPubKeyHex: t.string,
    address: t.string,
    spent: t.boolean,
    signer: t.number, // signing account address or index relative to accountId
  },
  'UtxoInfo',
)
export type UtxoInfo = t.TypeOf<typeof UtxoInfo>

export const WeightedChangeOutput = t.type(
  {
    address: t.string,
    weight: t.number,
  },
  'WeightedChangeOutput',
)
export type WeightedChangeOutput = t.TypeOf<typeof WeightedChangeOutput>

export type FilterChangeAddresses = (addresses: string[]) => Promise<string[]>
export const FilterChangeAddresses = functionT<FilterChangeAddresses>('NewBlockCallback')

export const CreateTransactionOptions = extendCodec(
  FeeOption,
  {},
  {
    sequenceNumber: Numeric, // Ripple/Stellar/Ethereum sequence number or nonce
    payportBalance: Numeric, // Spendable balance at the from payport (useful in conjunction with a BalanceMonitor)
    forcedUtxos: t.array(UtxoInfo), // utxos that must be used
    availableUtxos: t.array(UtxoInfo), // utxos that can be used
    useAllUtxos: t.boolean, // Uses all available utxos (ie sweep)
    useUnconfirmedUtxos: t.boolean, // Allow unconfirmed utxos as inputs
    recipientPaysFee: t.boolean, // Deduct fee from outputs (only utxo coins supported for now)
    maxFeePercent: Numeric, // Maximum fee as percent of output total
    changeAddress: t.union([t.string, t.array(t.string)]), // Change address
    filterChangeAddresses: FilterChangeAddresses
  },
  'CreateTransactionOptions',
)
export type CreateTransactionOptions = t.TypeOf<typeof CreateTransactionOptions>

export const GetPayportOptions = t.partial({}, 'GetPayportOptions')
export type GetPayportOptions = t.TypeOf<typeof GetPayportOptions>

export const ResolvedFeeOption = t.type({
  targetFeeLevel: FeeLevelT,
  targetFeeRate: t.string,
  targetFeeRateType: FeeRateTypeT,
  feeBase: t.string,
  feeMain: t.string,
}, 'ResolvedFeeOption')
export type ResolvedFeeOption = t.TypeOf<typeof ResolvedFeeOption>

export const BalanceResult = requiredOptionalCodec(
  {
    confirmedBalance: t.string, // balance with at least 1 confirmation
    unconfirmedBalance: t.string, // balance that is pending confirmation
    spendableBalance: t.string, // balance that can be spent (ie not locked in min balance)
    requiresActivation: t.boolean, // true if an address doesn't have min balance
    sweepable: t.boolean, // balance is high enough to be swept
  },
  {
    minimumBalance: t.string,
  },
  'BalanceResult',
)
export type BalanceResult = t.TypeOf<typeof BalanceResult>

export enum TransactionStatus {
  Unsigned = 'unsigned',
  Signed = 'signed',
  Pending = 'pending',
  Confirmed = 'confirmed',
  Failed = 'failed',
}
export const TransactionStatusT = enumCodec<TransactionStatus>(TransactionStatus, 'TransactionStatus')

export const TransactionOutput = requiredOptionalCodec(
  {
    address: t.string,
    value: t.string,
  },
  {
    extraId: nullable(t.string),
  },
  'TransactionOutput',
)
export type TransactionOutput = t.TypeOf<typeof TransactionOutput>

export const TransactionCommon = requiredOptionalCodec(
  {
    status: TransactionStatusT,
    id: nullable(t.string), // network txid
    fromAddress: nullable(t.string), // sender address
    toAddress: nullable(t.string), // recipient address
    fromIndex: nullable(t.number), // sender address index
    toIndex: nullable(t.number), // recipient address index, null if not ours
    amount: nullable(t.string), // main denomination (eg "0.125")
    fee: nullable(t.string), // total fee in main denomination
  },
  {
    fromExtraId: nullable(t.string), // eg ripple sender tag
    toExtraId: nullable(t.string), // eg Monero payment ID or ripple destination tag
    sequenceNumber: nullable(t.union([t.string, t.number])), // eg Ethereum nonce or ripple sequence
    inputUtxos: t.array(UtxoInfo),
    outputUtxos: t.array(UtxoInfo),
    externalOutputs: t.array(TransactionOutput),
    weight: t.number, // weight of this transaction for fee purposes (ie vbytes, gas limit)
  },
  'TransactionCommon',
)
export type TransactionCommon = t.TypeOf<typeof TransactionCommon>

export const BaseMultisigData = t.type(
  {
    m: t.number,

    // Parallel arrays
    accountIds: t.array(t.string),
    publicKeys: t.array(t.string),

    // Accounts that have already signed (not parallel)
    signedAccountIds: t.array(t.string),
  },
  'BitcoinMultisigData',
)
export type BaseMultisigData = t.TypeOf<typeof BaseMultisigData>

export const AddressMultisigData = extendCodec(
  BaseMultisigData,
  {
    signerIndex: t.number,
    inputIndices: t.array(t.number),
  },
  'AddressMultisigData',
)
export type AddressMultisigData = t.TypeOf<typeof AddressMultisigData>

export const MultiInputMultisigData = t.record(t.string, AddressMultisigData, 'MultiInputMultisigData')
export type MultiInputMultisigData = t.TypeOf<typeof MultiInputMultisigData>

export const MultisigData = t.union([BaseMultisigData, MultiInputMultisigData])
export type MultisigData = t.TypeOf<typeof MultisigData>

const UnsignedCommon = extendCodec(
  TransactionCommon,
  {
    fromAddress: t.string,
    toAddress: t.string,
    fromIndex: nullable(t.number), // same as multioutput
    targetFeeLevel: FeeLevelT, // fee level requested upon creation
    targetFeeRate: nullable(t.string), // fee rate requested upon creation
    targetFeeRateType: nullable(FeeRateTypeT), // fee rate type requested upon creation
  },
  {
    multisigData: MultisigData,
  },
  'UnsignedCommon',
)
type UnsignedCommon = t.TypeOf<typeof UnsignedCommon>

export const BaseUnsignedTransaction = extendCodec(
  UnsignedCommon,
  {
    status: t.literal(TransactionStatus.Unsigned),
    data: t.object,
  },
  'BaseUnsignedTransaction',
)
export type BaseUnsignedTransaction = t.TypeOf<typeof BaseUnsignedTransaction>

export const BaseSignedTransaction = extendCodec(
  UnsignedCommon,
  {
    status: t.literal(TransactionStatus.Signed),
    id: t.string,
    amount: t.string,
    fee: t.string,
    data: t.object,
  },
  'BaseSignedTransaction',
)
export type BaseSignedTransaction = t.TypeOf<typeof BaseSignedTransaction>

export const BaseTransactionInfo = extendCodec(
  TransactionCommon,
  {
    id: t.string,
    amount: t.string,
    fee: t.string,
    isExecuted: t.boolean, // true if transaction didn't fail (eg TRX/ETH contract succeeded)
    isConfirmed: t.boolean,
    confirmations: t.number, // 0 if not confirmed
    confirmationId: nullable(t.string), // eg block/ledger hash. null if not confirmed
    confirmationTimestamp: nullable(DateT), // block timestamp. null if timestamp unavailable or unconfirmed
    data: t.object,
  },
  {
    currentBlockNumber: t.union([t.string, t.number]), // latest head of the blockchain
    confirmationNumber: t.union([t.string, t.number]) // eg block number in which tx was included
  },
  'BaseTransactionInfo',
)
export type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>

export const BaseBroadcastResult = t.type(
  {
    id: t.string,
  },
  'BaseBroadcastResult',
)
export type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>

export const BalanceActivityType = t.union([t.literal('in'), t.literal('out')], 'BalanceActivityType')
export type BalanceActivityType = t.TypeOf<typeof BalanceActivityType>

export const BalanceActivity = requiredOptionalCodec(
  {
    type: BalanceActivityType,
    networkType: NetworkTypeT,
    networkSymbol: t.string,
    assetSymbol: t.string,
    address: t.string,
    extraId: nullable(t.string),
    amount: t.string,
    externalId: t.string,
    activitySequence: t.string,
    confirmationId: t.string,
    confirmationNumber: t.union([t.string, t.number]),
    timestamp: DateT,
  },
  {
    confirmations: t.number,
    // Utxos spent in this transaction applicable to the address
    utxosSpent: t.array(UtxoInfo),
    // Utxos create in this transaction applicable to the address
    utxosCreated: t.array(UtxoInfo),
  },
  'BalanceActivity',
)
export type BalanceActivity = t.TypeOf<typeof BalanceActivity>

export const BalanceMonitorConfig = BaseConfig
export type BalanceMonitorConfig = t.TypeOf<typeof BalanceMonitorConfig>

export const GetBalanceActivityOptions = t.partial(
  {
    from: t.union([Numeric, BalanceActivity]),
    to: t.union([Numeric, BalanceActivity]),
  },
  'GetBalanceActivityOptions',
)
export type GetBalanceActivityOptions = t.TypeOf<typeof GetBalanceActivityOptions>

export type BalanceActivityCallback = (ba: BalanceActivity, rawTx?: any) => Promise<void> | void
export const BalanceActivityCallback = functionT<BalanceActivityCallback>('BalanceActivityCallback')

export type NewBlockCallback = (b: { height: number, hash: string }) => Promise<void> | void
export const NewBlockCallback = functionT<NewBlockCallback>('NewBlockCallback')

export type FromTo = Pick<
  BaseUnsignedTransaction,
  'fromAddress' | 'fromIndex' | 'fromExtraId' | 'toAddress' | 'toIndex' | 'toExtraId'
> & { fromPayport: Payport; toPayport: Payport }

export const RetrieveBalanceActivitiesResult = t.type(
  {
    from: t.string,
    to: t.string,
  },
  'RetrieveBalanceActivitiesResult',
)
export type RetrieveBalanceActivitiesResult = t.TypeOf<typeof RetrieveBalanceActivitiesResult>

export const BlockInfo = requiredOptionalCodec(
  {
    id: t.string,
    height: t.number,
    time: DateT,
  },
  {
    previousId: t.string,
    raw: t.UnknownRecord,
  },
  'BlockInfo',
)
export type BlockInfo = t.TypeOf<typeof BlockInfo>

export type FilterBlockAddressesBlockInfo = BlockInfo & { page: number }
export type FilterBlockAddressesCallback = (
  addresses: string[], blockInfo: FilterBlockAddressesBlockInfo,
) => string[] | Promise<string[]>
