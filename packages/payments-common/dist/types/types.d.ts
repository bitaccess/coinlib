import * as t from 'io-ts';
export declare const AddressOrIndex: t.UnionC<[t.StringC, t.NumberC]>;
export declare type AddressOrIndex = t.TypeOf<typeof AddressOrIndex>;
export declare enum FeeLevel {
    Custom = "custom",
    Low = "low",
    Medium = "medium",
    High = "high"
}
export declare const FeeLevelT: t.Type<FeeLevel, FeeLevel, unknown>;
export declare enum FeeRateType {
    Main = "main",
    Base = "base",
    BasePerWeight = "base/weight"
}
export declare const FeeRateTypeT: t.Type<FeeRateType, FeeRateType, unknown>;
export declare const FeeOptionCustom: t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<FeeLevel.Custom>;
}>]>;
export declare const FeeOptionLevel: t.TypeC<{
    feeLevel: t.UnionC<[t.LiteralC<FeeLevel.High>, t.LiteralC<FeeLevel.Medium>, t.LiteralC<FeeLevel.Low>]>;
}>;
export declare const FeeOption: t.UnionC<[t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<FeeLevel.Custom>;
}>]>, t.TypeC<{
    feeLevel: t.UnionC<[t.LiteralC<FeeLevel.High>, t.LiteralC<FeeLevel.Medium>, t.LiteralC<FeeLevel.Low>]>;
}>]>;
export declare type FeeOption = t.TypeOf<typeof FeeOption>;
export declare const CreateTransactionOptions: t.UnionC<[t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<FeeLevel.Custom>;
}>]>, t.TypeC<{
    feeLevel: t.UnionC<[t.LiteralC<FeeLevel.High>, t.LiteralC<FeeLevel.Medium>, t.LiteralC<FeeLevel.Low>]>;
}>]>;
export declare type CreateTransactionOptions = t.TypeOf<typeof CreateTransactionOptions>;
export declare const ResolvedFeeOption: t.TypeC<{
    targetFeeLevel: t.Type<FeeLevel, FeeLevel, unknown>;
    targetFeeRate: t.StringC;
    targetFeeRateType: t.Type<FeeRateType, FeeRateType, unknown>;
    feeBase: t.StringC;
    feeMain: t.StringC;
}>;
export declare type ResolvedFeeOption = t.TypeOf<typeof ResolvedFeeOption>;
export declare const BalanceResult: t.TypeC<{
    balance: t.StringC;
    unconfirmedBalance: t.StringC;
}>;
export declare type BalanceResult = t.TypeOf<typeof BalanceResult>;
export declare enum TransactionStatus {
    Unsigned = "unsigned",
    Signed = "signed",
    Pending = "pending",
    Confirmed = "confirmed",
    Failed = "failed"
}
export declare const TransactionStatusT: t.Type<{}, {}, unknown>;
export declare const TransactionCommon: t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<{}, {}, unknown>;
}>;
export declare type TransactionCommon = t.TypeOf<typeof TransactionCommon>;
export declare const BaseUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<{}, {}, unknown>;
}>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<FeeLevel, FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<FeeRateType, FeeRateType, unknown>, t.NullC]>;
}>]>, t.TypeC<{
    status: t.LiteralC<"unsigned">;
    data: t.UnknownRecordC;
}>]>;
export declare type BaseUnsignedTransaction = t.TypeOf<typeof BaseUnsignedTransaction>;
export declare const BaseSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<{}, {}, unknown>;
}>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<FeeLevel, FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<FeeRateType, FeeRateType, unknown>, t.NullC]>;
}>]>, t.TypeC<{
    status: t.LiteralC<"signed">;
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    data: t.UnknownRecordC;
}>]>;
export declare type BaseSignedTransaction = t.TypeOf<typeof BaseSignedTransaction>;
export declare const BaseTransactionInfo: t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<{}, {}, unknown>;
}>, t.TypeC<{
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    isExecuted: t.BooleanC;
    isConfirmed: t.BooleanC;
    confirmations: t.NumberC;
    block: t.UnionC<[t.NumberC, t.NullC]>;
    date: t.UnionC<[import("@faast/ts-common").DateC, t.NullC]>;
    data: t.UnknownRecordC;
}>]>;
export declare type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>;
export declare const BaseBroadcastResult: t.TypeC<{
    id: t.StringC;
}>;
export declare type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>;
