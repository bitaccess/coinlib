import * as t from 'io-ts';
export declare enum NetworkType {
    Mainnet = "mainnet",
    Testnet = "testnet"
}
export declare const NetworkTypeT: t.Type<NetworkType, NetworkType, unknown>;
export declare const BaseConfig: t.PartialC<{
    network: t.Type<NetworkType, NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>;
export declare type BaseConfig = t.TypeOf<typeof BaseConfig>;
export declare const AddressOrIndex: t.UnionC<[t.StringC, t.NumberC]>;
export declare type AddressOrIndex = t.TypeOf<typeof AddressOrIndex>;
export declare enum FeeLevel {
    Custom = "custom",
    Low = "low",
    Medium = "medium",
    High = "high"
}
export declare const FeeLevelT: t.Type<FeeLevel, FeeLevel, unknown>;
export declare const AutoFeeLevels: t.KeyofC<{
    [FeeLevel.Low]: null;
    [FeeLevel.Medium]: null;
    [FeeLevel.High]: null;
}>;
export declare type AutoFeeLevels = t.TypeOf<typeof AutoFeeLevels>;
export declare enum FeeRateType {
    Main = "main",
    Base = "base",
    BasePerWeight = "base/weight"
}
export declare const FeeRateTypeT: t.Type<FeeRateType, FeeRateType, unknown>;
export declare const FeeRate: t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
}>;
export declare type FeeRate = t.TypeOf<typeof FeeRate>;
export declare const FeeOptionCustom: t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<FeeLevel.Custom>;
}>]>;
export declare type FeeOptionCustom = t.TypeOf<typeof FeeOptionCustom>;
export declare const FeeOptionLevel: t.PartialC<{
    feeLevel: t.UnionC<[t.LiteralC<FeeLevel.High>, t.LiteralC<FeeLevel.Medium>, t.LiteralC<FeeLevel.Low>]>;
}>;
export declare type FeeOptionLevel = t.TypeOf<typeof FeeOptionLevel>;
export declare const FeeOption: t.UnionC<[t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<FeeLevel.Custom>;
}>]>, t.PartialC<{
    feeLevel: t.UnionC<[t.LiteralC<FeeLevel.High>, t.LiteralC<FeeLevel.Medium>, t.LiteralC<FeeLevel.Low>]>;
}>]>;
export declare type FeeOption = t.TypeOf<typeof FeeOption>;
export declare const UtxoInfo: t.IntersectionC<[t.TypeC<{
    txid: t.StringC;
    vout: t.NumberC;
    value: t.StringC;
}>, t.PartialC<{
    confirmations: t.NumberC;
    height: t.StringC;
    lockTime: t.StringC;
    coinbase: t.BooleanC;
}>]>;
export declare type UtxoInfo = t.TypeOf<typeof UtxoInfo>;
export declare const CreateTransactionOptions: t.IntersectionC<[t.UnionC<[t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<FeeLevel.Custom>;
}>]>, t.PartialC<{
    feeLevel: t.UnionC<[t.LiteralC<FeeLevel.High>, t.LiteralC<FeeLevel.Medium>, t.LiteralC<FeeLevel.Low>]>;
}>]>, t.PartialC<{
    sequenceNumber: t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>;
    payportBalance: t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>;
    utxos: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        confirmations: t.NumberC;
        height: t.StringC;
        lockTime: t.StringC;
        coinbase: t.BooleanC;
    }>]>>;
    useAllUtxos: t.BooleanC;
}>]>;
export declare type CreateTransactionOptions = t.TypeOf<typeof CreateTransactionOptions>;
export declare const GetPayportOptions: t.PartialC<{}>;
export declare type GetPayportOptions = t.TypeOf<typeof GetPayportOptions>;
export declare const ResolvedFeeOption: t.TypeC<{
    targetFeeLevel: t.Type<FeeLevel, FeeLevel, unknown>;
    targetFeeRate: t.StringC;
    targetFeeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
    feeBase: t.StringC;
    feeMain: t.StringC;
}>;
export declare type ResolvedFeeOption = t.TypeOf<typeof ResolvedFeeOption>;
export declare const BalanceResult: t.TypeC<{
    confirmedBalance: t.StringC;
    unconfirmedBalance: t.StringC;
    sweepable: t.BooleanC;
}>;
export declare type BalanceResult = t.TypeOf<typeof BalanceResult>;
export declare enum TransactionStatus {
    Unsigned = "unsigned",
    Signed = "signed",
    Pending = "pending",
    Confirmed = "confirmed",
    Failed = "failed"
}
export declare const TransactionStatusT: t.Type<TransactionStatus, TransactionStatus, unknown>;
export declare const TransactionCommon: t.IntersectionC<[t.TypeC<{
    status: t.Type<TransactionStatus, TransactionStatus, unknown>;
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
}>, t.PartialC<{
    fromExtraId: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    sequenceNumber: t.UnionC<[t.UnionC<[t.StringC, t.NumberC]>, t.NullC]>;
}>]>;
export declare type TransactionCommon = t.TypeOf<typeof TransactionCommon>;
export declare const BaseUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    status: t.Type<TransactionStatus, TransactionStatus, unknown>;
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
}>, t.PartialC<{
    fromExtraId: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    sequenceNumber: t.UnionC<[t.UnionC<[t.StringC, t.NumberC]>, t.NullC]>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<FeeLevel, FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<FeeRateType, FeeRateType, unknown>, t.NullC]>;
}>, t.PartialC<{
    inputUtxos: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        confirmations: t.NumberC;
        height: t.StringC;
        lockTime: t.StringC;
        coinbase: t.BooleanC;
    }>]>>;
}>]>, t.TypeC<{
    status: t.LiteralC<TransactionStatus.Unsigned>;
    data: t.ObjectC;
}>]>;
export declare type BaseUnsignedTransaction = t.TypeOf<typeof BaseUnsignedTransaction>;
export declare const BaseSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    status: t.Type<TransactionStatus, TransactionStatus, unknown>;
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
}>, t.PartialC<{
    fromExtraId: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    sequenceNumber: t.UnionC<[t.UnionC<[t.StringC, t.NumberC]>, t.NullC]>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<FeeLevel, FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<FeeRateType, FeeRateType, unknown>, t.NullC]>;
}>, t.PartialC<{
    inputUtxos: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        confirmations: t.NumberC;
        height: t.StringC;
        lockTime: t.StringC;
        coinbase: t.BooleanC;
    }>]>>;
}>]>, t.TypeC<{
    status: t.LiteralC<TransactionStatus.Signed>;
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    data: t.ObjectC;
}>]>;
export declare type BaseSignedTransaction = t.TypeOf<typeof BaseSignedTransaction>;
export declare const BaseTransactionInfo: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    status: t.Type<TransactionStatus, TransactionStatus, unknown>;
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
}>, t.PartialC<{
    fromExtraId: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    sequenceNumber: t.UnionC<[t.UnionC<[t.StringC, t.NumberC]>, t.NullC]>;
}>]>, t.TypeC<{
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    isExecuted: t.BooleanC;
    isConfirmed: t.BooleanC;
    confirmations: t.NumberC;
    confirmationId: t.UnionC<[t.StringC, t.NullC]>;
    confirmationTimestamp: t.UnionC<[import("@faast/ts-common").DateC, t.NullC]>;
    data: t.ObjectC;
}>, t.PartialC<{
    confirmationNumber: t.StringC;
}>]>;
export declare type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>;
export declare const BaseBroadcastResult: t.TypeC<{
    id: t.StringC;
}>;
export declare type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>;
export declare const Payport: t.IntersectionC<[t.TypeC<{
    address: t.StringC;
}>, t.PartialC<{
    extraId: t.UnionC<[t.StringC, t.NullC]>;
}>]>;
export declare type Payport = t.TypeOf<typeof Payport>;
export declare const BalanceActivityType: t.UnionC<[t.LiteralC<"in">, t.LiteralC<"out">]>;
export declare type BalanceActivityType = t.TypeOf<typeof BalanceActivityType>;
export declare const BalanceActivity: t.TypeC<{
    type: t.UnionC<[t.LiteralC<"in">, t.LiteralC<"out">]>;
    networkType: t.Type<NetworkType, NetworkType, unknown>;
    networkSymbol: t.StringC;
    assetSymbol: t.StringC;
    address: t.StringC;
    extraId: t.UnionC<[t.StringC, t.NullC]>;
    amount: t.StringC;
    externalId: t.StringC;
    activitySequence: t.StringC;
    confirmationId: t.StringC;
    confirmationNumber: t.UnionC<[t.StringC, t.NumberC]>;
    timestamp: import("@faast/ts-common").DateC;
}>;
export declare type BalanceActivity = t.TypeOf<typeof BalanceActivity>;
export declare const BalanceMonitorConfig: t.PartialC<{
    network: t.Type<NetworkType, NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>;
export declare type BalanceMonitorConfig = t.TypeOf<typeof BalanceMonitorConfig>;
export declare const GetBalanceActivityOptions: t.PartialC<{
    from: t.UnionC<[t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>, t.TypeC<{
        type: t.UnionC<[t.LiteralC<"in">, t.LiteralC<"out">]>;
        networkType: t.Type<NetworkType, NetworkType, unknown>;
        networkSymbol: t.StringC;
        assetSymbol: t.StringC;
        address: t.StringC;
        extraId: t.UnionC<[t.StringC, t.NullC]>;
        amount: t.StringC;
        externalId: t.StringC;
        activitySequence: t.StringC;
        confirmationId: t.StringC;
        confirmationNumber: t.UnionC<[t.StringC, t.NumberC]>;
        timestamp: import("@faast/ts-common").DateC;
    }>]>;
    to: t.UnionC<[t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>, t.TypeC<{
        type: t.UnionC<[t.LiteralC<"in">, t.LiteralC<"out">]>;
        networkType: t.Type<NetworkType, NetworkType, unknown>;
        networkSymbol: t.StringC;
        assetSymbol: t.StringC;
        address: t.StringC;
        extraId: t.UnionC<[t.StringC, t.NullC]>;
        amount: t.StringC;
        externalId: t.StringC;
        activitySequence: t.StringC;
        confirmationId: t.StringC;
        confirmationNumber: t.UnionC<[t.StringC, t.NumberC]>;
        timestamp: import("@faast/ts-common").DateC;
    }>]>;
}>;
export declare type GetBalanceActivityOptions = t.TypeOf<typeof GetBalanceActivityOptions>;
export declare type BalanceActivityCallback = (ba: BalanceActivity) => Promise<void> | void;
export declare const BalanceActivityCallback: import("@faast/ts-common").FunctionC<BalanceActivityCallback>;
export declare type FromTo = Pick<BaseUnsignedTransaction, 'fromAddress' | 'fromIndex' | 'fromExtraId' | 'toAddress' | 'toIndex' | 'toExtraId'> & {
    fromPayport: Payport;
    toPayport: Payport;
};
export declare const ResolveablePayport: t.UnionC<[t.IntersectionC<[t.TypeC<{
    address: t.StringC;
}>, t.PartialC<{
    extraId: t.UnionC<[t.StringC, t.NullC]>;
}>]>, t.StringC, t.NumberC]>;
export declare type ResolveablePayport = t.TypeOf<typeof ResolveablePayport>;
export declare const RetrieveBalanceActivitiesResult: t.TypeC<{
    from: t.StringC;
    to: t.StringC;
}>;
export declare type RetrieveBalanceActivitiesResult = t.TypeOf<typeof RetrieveBalanceActivitiesResult>;
