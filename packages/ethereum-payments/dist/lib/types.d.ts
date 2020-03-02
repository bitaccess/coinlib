import * as t from 'io-ts';
export declare const EthereumSignatory: t.TypeC<{
    address: t.StringC;
    keys: t.TypeC<{
        pub: t.StringC;
        prv: t.StringC;
    }>;
    xkeys: t.TypeC<{
        xprv: t.StringC;
        xpub: t.StringC;
    }>;
}>;
export declare type EthereumSignatory = t.TypeOf<typeof EthereumSignatory>;
export declare const BaseEthereumPaymentsConfig: t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    fullNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    parityNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    gasStation: t.UnionC<[t.StringC, t.UndefinedC]>;
}>]>;
export declare type BaseEthereumPaymentsConfig = t.TypeOf<typeof BaseEthereumPaymentsConfig>;
export declare const HdEthereumPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    fullNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    parityNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    gasStation: t.UnionC<[t.StringC, t.UndefinedC]>;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>]>;
export declare type HdEthereumPaymentsConfig = t.TypeOf<typeof HdEthereumPaymentsConfig>;
export declare const KeyPairEthereumPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    fullNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    parityNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    gasStation: t.UnionC<[t.StringC, t.UndefinedC]>;
}>]>, t.TypeC<{
    keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
}>]>;
export declare type KeyPairEthereumPaymentsConfig = t.TypeOf<typeof KeyPairEthereumPaymentsConfig>;
export declare const EthereumPaymentsConfig: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    fullNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    parityNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    gasStation: t.UnionC<[t.StringC, t.UndefinedC]>;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>]>, t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    fullNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    parityNode: t.UnionC<[t.StringC, t.UndefinedC]>;
    gasStation: t.UnionC<[t.StringC, t.UndefinedC]>;
}>]>, t.TypeC<{
    keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
}>]>]>;
export declare type EthereumPaymentsConfig = t.TypeOf<typeof EthereumPaymentsConfig>;
export declare const EthereumUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    sequenceNumber: t.UnionC<[t.UnionC<[t.StringC, t.NumberC]>, t.NullC]>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
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
    status: t.LiteralC<import("@faast/payments-common").TransactionStatus.Unsigned>;
    data: t.ObjectC;
}>]>, t.TypeC<{
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
}>]>;
export declare type EthereumUnsignedTransaction = t.TypeOf<typeof EthereumUnsignedTransaction>;
export declare const EthereumSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    sequenceNumber: t.UnionC<[t.UnionC<[t.StringC, t.NumberC]>, t.NullC]>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
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
    status: t.LiteralC<import("@faast/payments-common").TransactionStatus.Signed>;
    id: t.StringC;
    amount: t.StringC;
    fee: t.StringC;
    data: t.ObjectC;
}>]>, t.TypeC<{
    data: t.TypeC<{
        hex: t.StringC;
    }>;
}>]>;
export declare type EthereumSignedTransaction = t.TypeOf<typeof EthereumSignedTransaction>;
export declare const EthereumTransactionInfo: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    confirmationNumber: t.UnionC<[t.StringC, t.NumberC]>;
}>]>;
export declare type EthereumTransactionInfo = t.TypeOf<typeof EthereumTransactionInfo>;
export declare const EthereumBroadcastResult: t.IntersectionC<[t.TypeC<{
    id: t.StringC;
}>, t.TypeC<{
    transactionIndex: t.NumberC;
    blockHash: t.StringC;
    blockNumber: t.NumberC;
    from: t.StringC;
    to: t.StringC;
    gasUsed: t.NumberC;
    cumulativeGasUsed: t.NumberC;
    status: t.BooleanC;
}>]>;
export declare type EthereumBroadcastResult = t.TypeOf<typeof EthereumBroadcastResult>;
export declare const EthereumResolvedFeeOption: t.IntersectionC<[t.TypeC<{
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.StringC;
    targetFeeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
    feeBase: t.StringC;
    feeMain: t.StringC;
}>, t.TypeC<{
    gasPrice: t.StringC;
}>]>;
export declare type EthereumResolvedFeeOption = t.TypeOf<typeof EthereumResolvedFeeOption>;
export declare const BaseDenominationOptions: t.IntersectionC<[t.ObjectC, t.PartialC<{
    rounding: t.UnionC<[t.LiteralC<1>, t.LiteralC<2>, t.LiteralC<3>, t.LiteralC<4>, t.LiteralC<5>, t.LiteralC<6>, t.LiteralC<7>, t.LiteralC<8>]>;
}>]>;
export declare type BaseDenominationOptions = t.TypeOf<typeof BaseDenominationOptions>;
