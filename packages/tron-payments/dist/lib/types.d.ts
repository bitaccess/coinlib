import * as t from 'io-ts';
import { CreateTransactionOptions } from '@faast/payments-common';
import { Transaction as TronWebTransaction, TransactionInfo as TronWebTransactionInfo, Block as TronWebBlock } from 'tronweb';
export { TronWebTransaction, TronWebTransactionInfo, TronWebBlock, CreateTransactionOptions };
export declare type TransactionInfoRaw = TronWebTransaction & TronWebTransactionInfo & {
    currentBlock: Pick<TronWebBlock, 'blockID' | 'block_header'>;
};
export declare const BaseTronPaymentsConfig: t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
}>, t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>]>;
export declare type BaseTronPaymentsConfig = t.TypeOf<typeof BaseTronPaymentsConfig>;
export declare const HdTronPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
}>, t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>, t.PartialC<{
    maxAddressScan: t.NumberC;
}>]>;
export declare type HdTronPaymentsConfig = t.TypeOf<typeof HdTronPaymentsConfig>;
export declare const KeyPairTronPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
}>, t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>]>, t.TypeC<{
    keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
}>]>;
export declare type KeyPairTronPaymentsConfig = t.TypeOf<typeof KeyPairTronPaymentsConfig>;
export declare const TronPaymentsConfig: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
}>, t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>, t.PartialC<{
    maxAddressScan: t.NumberC;
}>]>, t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
}>, t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>]>, t.TypeC<{
    keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
}>]>]>;
export declare type TronPaymentsConfig = t.TypeOf<typeof TronPaymentsConfig>;
export declare const TronUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<string, string, unknown>;
}>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
}>]>, t.TypeC<{
    status: t.LiteralC<"unsigned">;
    data: t.ObjectC;
}>]>, t.TypeC<{
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
}>]>;
export declare type TronUnsignedTransaction = t.TypeOf<typeof TronUnsignedTransaction>;
export declare const TronSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<string, string, unknown>;
}>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
}>]>, t.TypeC<{
    status: t.LiteralC<"signed">;
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    data: t.ObjectC;
}>]>;
export declare type TronSignedTransaction = t.TypeOf<typeof TronSignedTransaction>;
export declare const TronTransactionInfo: t.IntersectionC<[t.TypeC<{
    id: t.UnionC<[t.StringC, t.NullC]>;
    fromAddress: t.UnionC<[t.StringC, t.NullC]>;
    toAddress: t.UnionC<[t.StringC, t.NullC]>;
    toExtraId: t.UnionC<[t.StringC, t.NullC]>;
    fromIndex: t.UnionC<[t.NumberC, t.NullC]>;
    toIndex: t.UnionC<[t.NumberC, t.NullC]>;
    amount: t.UnionC<[t.StringC, t.NullC]>;
    fee: t.UnionC<[t.StringC, t.NullC]>;
    status: t.Type<string, string, unknown>;
}>, t.TypeC<{
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    isExecuted: t.BooleanC;
    isConfirmed: t.BooleanC;
    confirmations: t.NumberC;
    confirmationId: t.UnionC<[t.StringC, t.NullC]>;
    confirmationTimestamp: t.UnionC<[import("@faast/ts-common").DateC, t.NullC]>;
    data: t.ObjectC;
}>]>;
export declare type TronTransactionInfo = t.TypeOf<typeof TronTransactionInfo>;
export declare const TronBroadcastResult: t.IntersectionC<[t.TypeC<{
    id: t.StringC;
}>, t.TypeC<{
    rebroadcast: t.BooleanC;
}>]>;
export declare type TronBroadcastResult = t.TypeOf<typeof TronBroadcastResult>;
export declare const GetAddressOptions: t.PartialC<{
    cacheIndex: t.BooleanC;
}>;
export declare type GetAddressOptions = t.TypeOf<typeof GetAddressOptions>;
