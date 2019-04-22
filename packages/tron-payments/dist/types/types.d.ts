import * as t from 'io-ts';
import { Transaction as TronWebTransaction, TransactionInfo as TronWebTransactionInfo, Block as TronWebBlock } from 'tronweb';
export { TronWebTransaction, TronWebTransactionInfo, TronWebBlock };
export declare type TransactionInfoRaw = TronWebTransaction & TronWebTransactionInfo & {
    currentBlock: Pick<TronWebBlock, 'blockID' | 'block_header'>;
};
export declare const BaseTronPaymentsConfig: t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>;
export declare type BaseTronPaymentsConfig = t.TypeOf<typeof BaseTronPaymentsConfig>;
export declare const HdTronPaymentsConfig: t.IntersectionC<[t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>, t.TypeC<{
    hdKey: t.StringC;
}>, t.PartialC<{
    maxAddressScan: t.NumberC;
}>]>;
export declare type HdTronPaymentsConfig = t.TypeOf<typeof HdTronPaymentsConfig>;
export declare const KeyPairTronPaymentsConfig: t.IntersectionC<[t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>, t.TypeC<{
    keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.StringC>]>;
}>, t.PartialC<{}>]>;
export declare type KeyPairTronPaymentsConfig = t.TypeOf<typeof KeyPairTronPaymentsConfig>;
export declare const TronPaymentsConfig: t.UnionC<[t.IntersectionC<[t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>, t.TypeC<{
    hdKey: t.StringC;
}>, t.PartialC<{
    maxAddressScan: t.NumberC;
}>]>, t.IntersectionC<[t.PartialC<{
    fullNode: t.StringC;
    solidityNode: t.StringC;
    eventServer: t.StringC;
}>, t.TypeC<{
    keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.StringC>]>;
}>, t.PartialC<{}>]>]>;
export declare type TronPaymentsConfig = t.TypeOf<typeof TronPaymentsConfig>;
export declare const TronUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
}>, t.PartialC<{}>]>, t.TypeC<{
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
}>, t.PartialC<{}>]>;
export declare type TronUnsignedTransaction = t.TypeOf<typeof TronUnsignedTransaction>;
export declare const TronSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
}>, t.PartialC<{}>]>, t.TypeC<{}>, t.PartialC<{}>]>;
export declare type TronSignedTransaction = t.TypeOf<typeof TronSignedTransaction>;
export declare const TronTransactionInfo: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    date: t.UnionC<[import("payments-common").DateC, t.NullC]>;
    rawInfo: t.UnknownRecordC;
}>, t.PartialC<{}>]>, t.TypeC<{
    from: t.StringC;
    to: t.StringC;
}>, t.PartialC<{}>]>;
export declare type TronTransactionInfo = t.TypeOf<typeof TronTransactionInfo>;
export declare const TronBroadcastResult: t.IntersectionC<[t.TypeC<{
    id: t.StringC;
}>, t.TypeC<{
    rebroadcast: t.BooleanC;
}>, t.PartialC<{}>]>;
export declare type TronBroadcastResult = t.TypeOf<typeof TronBroadcastResult>;
export declare const CreateTransactionOptions: t.PartialC<{
    fee: t.NumberC;
}>;
export declare type CreateTransactionOptions = t.TypeOf<typeof CreateTransactionOptions>;
export declare const GetAddressOptions: t.PartialC<{
    cacheIndex: t.BooleanC;
}>;
export declare type GetAddressOptions = t.TypeOf<typeof GetAddressOptions>;
