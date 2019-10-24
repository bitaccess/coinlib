import * as t from 'io-ts';
import { CreateTransactionOptions, Payport, FromTo } from '@faast/payments-common';
import * as Stellar from 'stellar-sdk';
export declare type StellarCollectionPage<T extends Stellar.Horizon.BaseResponse<never>> = Stellar.ServerApi.CollectionPage<T>;
export declare type StellarRawTransaction = Stellar.ServerApi.TransactionRecord;
export declare type StellarRawLedger = Stellar.ServerApi.LedgerRecord;
export { StellarRawTransaction as StellarTransaction, StellarRawLedger as StellarLedger, CreateTransactionOptions };
export declare type TransactionInfoRaw = StellarRawTransaction & {
    currentLedger: StellarRawLedger;
};
export declare const BaseStellarConfig: t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<Stellar.Server, Stellar.Server, unknown>, t.NullC]>;
}>]>;
export declare type BaseStellarConfig = t.TypeOf<typeof BaseStellarConfig>;
export declare const StellarBalanceMonitorConfig: t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<Stellar.Server, Stellar.Server, unknown>, t.NullC]>;
}>]>;
export declare type StellarBalanceMonitorConfig = t.TypeOf<typeof StellarBalanceMonitorConfig>;
export declare const BaseStellarPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<Stellar.Server, Stellar.Server, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    txTimeoutSeconds: t.NumberC;
}>]>;
export declare type BaseStellarPaymentsConfig = t.TypeOf<typeof BaseStellarPaymentsConfig>;
export declare const HdStellarPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<Stellar.Server, Stellar.Server, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    txTimeoutSeconds: t.NumberC;
}>]>, t.TypeC<{
    seed: t.StringC;
}>]>;
export declare type HdStellarPaymentsConfig = t.TypeOf<typeof HdStellarPaymentsConfig>;
export declare const StellarSignatory: t.TypeC<{
    address: t.StringC;
    secret: t.StringC;
}>;
export declare type StellarSignatory = t.TypeOf<typeof StellarSignatory>;
export declare const PartialStellarSignatory: t.PartialC<{
    address: t.StringC;
    secret: t.StringC;
}>;
export declare type PartialStellarSignatory = t.TypeOf<typeof PartialStellarSignatory>;
export declare const StellarAccountConfig: t.UnionC<[t.StringC, t.PartialC<{
    address: t.StringC;
    secret: t.StringC;
}>]>;
export declare type StellarAccountConfig = t.TypeOf<typeof StellarAccountConfig>;
export declare const AccountStellarPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<Stellar.Server, Stellar.Server, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    txTimeoutSeconds: t.NumberC;
}>]>, t.TypeC<{
    hotAccount: t.UnionC<[t.StringC, t.PartialC<{
        address: t.StringC;
        secret: t.StringC;
    }>]>;
    depositAccount: t.UnionC<[t.StringC, t.PartialC<{
        address: t.StringC;
        secret: t.StringC;
    }>]>;
}>]>;
export declare type AccountStellarPaymentsConfig = t.TypeOf<typeof AccountStellarPaymentsConfig>;
export declare const StellarPaymentsConfig: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<Stellar.Server, Stellar.Server, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    txTimeoutSeconds: t.NumberC;
}>]>, t.TypeC<{
    seed: t.StringC;
}>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<Stellar.Server, Stellar.Server, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    txTimeoutSeconds: t.NumberC;
}>]>, t.TypeC<{
    hotAccount: t.UnionC<[t.StringC, t.PartialC<{
        address: t.StringC;
        secret: t.StringC;
    }>]>;
    depositAccount: t.UnionC<[t.StringC, t.PartialC<{
        address: t.StringC;
        secret: t.StringC;
    }>]>;
}>]>]>;
export declare type StellarPaymentsConfig = t.TypeOf<typeof StellarPaymentsConfig>;
export declare const StellarUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    status: t.Type<import("@faast/payments-common").TransactionStatus, import("@faast/payments-common").TransactionStatus, unknown>;
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
    sequenceNumber: t.UnionC<[t.NumberC, t.NullC]>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
}>]>, t.TypeC<{
    status: t.LiteralC<import("@faast/payments-common").TransactionStatus.Unsigned>;
    data: t.ObjectC;
}>]>, t.TypeC<{
    amount: t.StringC;
    fee: t.StringC;
}>]>;
export declare type StellarUnsignedTransaction = t.TypeOf<typeof StellarUnsignedTransaction>;
export declare const StellarSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    status: t.Type<import("@faast/payments-common").TransactionStatus, import("@faast/payments-common").TransactionStatus, unknown>;
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
    sequenceNumber: t.UnionC<[t.NumberC, t.NullC]>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
}>]>, t.TypeC<{
    status: t.LiteralC<import("@faast/payments-common").TransactionStatus.Signed>;
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    data: t.ObjectC;
}>]>;
export declare type StellarSignedTransaction = t.TypeOf<typeof StellarSignedTransaction>;
export declare const StellarTransactionInfo: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    status: t.Type<import("@faast/payments-common").TransactionStatus, import("@faast/payments-common").TransactionStatus, unknown>;
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
    sequenceNumber: t.UnionC<[t.NumberC, t.NullC]>;
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
}>]>, t.TypeC<{
    confirmationNumber: t.UnionC<[t.NumberC, t.NullC]>;
}>]>;
export declare type StellarTransactionInfo = t.TypeOf<typeof StellarTransactionInfo>;
export declare const StellarBroadcastResult: t.IntersectionC<[t.TypeC<{
    id: t.StringC;
}>, t.TypeC<{
    rebroadcast: t.BooleanC;
    data: t.ObjectC;
}>]>;
export declare type StellarBroadcastResult = t.TypeOf<typeof StellarBroadcastResult>;
export declare const StellarCreateTransactionOptions: t.IntersectionC<[t.IntersectionC<[t.UnionC<[t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<import("@faast/payments-common").FeeLevel.Custom>;
}>]>, t.PartialC<{
    feeLevel: t.UnionC<[t.LiteralC<import("@faast/payments-common").FeeLevel.High>, t.LiteralC<import("@faast/payments-common").FeeLevel.Medium>, t.LiteralC<import("@faast/payments-common").FeeLevel.Low>]>;
}>]>, t.PartialC<{
    sequenceNumber: t.NumberC;
    payportBalance: t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>;
}>]>, t.PartialC<{
    timeoutSeconds: t.NumberC;
}>]>;
export declare type StellarCreateTransactionOptions = t.TypeOf<typeof StellarCreateTransactionOptions>;
export declare type FromToWithPayport = FromTo & {
    fromPayport: Payport;
    toPayport: Payport;
};
