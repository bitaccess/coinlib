import * as t from 'io-ts';
export * from './DateT';
export * from './helpers';
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
    from: t.UnionC<[t.StringC, t.NullC]>;
    to: t.UnionC<[t.StringC, t.NullC]>;
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
    from: t.UnionC<[t.StringC, t.NullC]>;
    to: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<{}, {}, unknown>;
}>, t.TypeC<{
    from: t.StringC;
    to: t.StringC;
    fromIndex: t.NumberC;
    rawUnsigned: t.UnknownRecordC;
}>, t.PartialC<{}>]>, t.TypeC<{
    status: t.LiteralC<"unsigned">;
}>, t.PartialC<{}>]>;
export declare type BaseUnsignedTransaction = t.TypeOf<typeof BaseUnsignedTransaction>;
export declare const BaseSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    from: t.UnionC<[t.StringC, t.NullC]>;
    to: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<{}, {}, unknown>;
}>, t.TypeC<{
    from: t.StringC;
    to: t.StringC;
    fromIndex: t.NumberC;
    rawUnsigned: t.UnknownRecordC;
}>, t.PartialC<{}>]>, t.TypeC<{
    status: t.LiteralC<"signed">;
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    rawSigned: t.UnknownRecordC;
}>, t.PartialC<{}>]>;
export declare type BaseSignedTransaction = t.TypeOf<typeof BaseSignedTransaction>;
export declare const BaseTransactionInfo: t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    from: t.UnionC<[t.StringC, t.NullC]>;
    to: t.UnionC<[t.StringC, t.NullC]>;
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
    date: t.UnionC<[import("./DateT").DateC, t.NullC]>;
    rawInfo: t.UnknownRecordC;
}>, t.PartialC<{}>]>;
export declare type BaseTransactionInfo = t.TypeOf<typeof BaseTransactionInfo>;
export declare const BaseBroadcastResult: t.TypeC<{
    id: t.StringC;
}>;
export declare type BaseBroadcastResult = t.TypeOf<typeof BaseBroadcastResult>;
