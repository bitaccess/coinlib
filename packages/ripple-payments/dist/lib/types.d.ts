import * as t from 'io-ts';
import { CreateTransactionOptions, Payport, FromTo } from '@faast/payments-common';
import { FormattedTransactionType as RippleTransaction, RippleAPI } from 'ripple-lib';
import { KeyPair } from 'ripple-lib/dist/npm/transaction/types';
declare type PromiseValue<T> = T extends Promise<infer X> ? X : never;
declare type RippleLedger = PromiseValue<ReturnType<RippleAPI['getLedger']>>;
export { RippleTransaction, RippleLedger, CreateTransactionOptions };
export declare type TransactionInfoRaw = RippleTransaction & {
    currentLedger: RippleLedger;
};
export declare class RippleServerAPI extends RippleAPI {
}
export declare const BaseRippleConfig: t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<RippleServerAPI, RippleServerAPI, unknown>, t.NullC]>;
}>]>;
export declare type BaseRippleConfig = t.TypeOf<typeof BaseRippleConfig>;
export declare const RippleBalanceMonitorConfig: t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<RippleServerAPI, RippleServerAPI, unknown>, t.NullC]>;
}>]>;
export declare type RippleBalanceMonitorConfig = t.TypeOf<typeof RippleBalanceMonitorConfig>;
export declare const BaseRipplePaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<RippleServerAPI, RippleServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    maxLedgerVersionOffset: t.NumberC;
}>]>;
export declare type BaseRipplePaymentsConfig = t.TypeOf<typeof BaseRipplePaymentsConfig>;
export declare const HdRipplePaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<RippleServerAPI, RippleServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    maxLedgerVersionOffset: t.NumberC;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>]>;
export declare type HdRipplePaymentsConfig = t.TypeOf<typeof HdRipplePaymentsConfig>;
export declare const RippleKeyPair: t.TypeC<{
    publicKey: t.StringC;
    privateKey: t.StringC;
}>;
export declare type RippleKeyPair = t.TypeOf<typeof RippleKeyPair>;
export declare const RippleSecretPair: t.TypeC<{
    address: t.StringC;
    secret: t.StringC;
}>;
export declare type RippleSecretPair = t.TypeOf<typeof RippleSecretPair>;
export declare const RippleAccountConfig: t.UnionC<[t.StringC, t.TypeC<{
    address: t.StringC;
    secret: t.StringC;
}>, t.TypeC<{
    publicKey: t.StringC;
    privateKey: t.StringC;
}>]>;
export declare type RippleAccountConfig = t.TypeOf<typeof RippleAccountConfig>;
export declare const AccountRipplePaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<RippleServerAPI, RippleServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    maxLedgerVersionOffset: t.NumberC;
}>]>, t.TypeC<{
    hotAccount: t.UnionC<[t.StringC, t.TypeC<{
        address: t.StringC;
        secret: t.StringC;
    }>, t.TypeC<{
        publicKey: t.StringC;
        privateKey: t.StringC;
    }>]>;
    depositAccount: t.UnionC<[t.StringC, t.TypeC<{
        address: t.StringC;
        secret: t.StringC;
    }>, t.TypeC<{
        publicKey: t.StringC;
        privateKey: t.StringC;
    }>]>;
}>]>;
export declare type AccountRipplePaymentsConfig = t.TypeOf<typeof AccountRipplePaymentsConfig>;
export declare const RipplePaymentsConfig: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<RippleServerAPI, RippleServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    maxLedgerVersionOffset: t.NumberC;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.Type<RippleServerAPI, RippleServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    maxLedgerVersionOffset: t.NumberC;
}>]>, t.TypeC<{
    hotAccount: t.UnionC<[t.StringC, t.TypeC<{
        address: t.StringC;
        secret: t.StringC;
    }>, t.TypeC<{
        publicKey: t.StringC;
        privateKey: t.StringC;
    }>]>;
    depositAccount: t.UnionC<[t.StringC, t.TypeC<{
        address: t.StringC;
        secret: t.StringC;
    }>, t.TypeC<{
        publicKey: t.StringC;
        privateKey: t.StringC;
    }>]>;
}>]>]>;
export declare type RipplePaymentsConfig = t.TypeOf<typeof RipplePaymentsConfig>;
export declare const RippleUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    amount: t.StringC;
    fee: t.StringC;
}>]>;
export declare type RippleUnsignedTransaction = t.TypeOf<typeof RippleUnsignedTransaction>;
export declare const RippleSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    id: t.StringC;
}>]>;
export declare type RippleSignedTransaction = t.TypeOf<typeof RippleSignedTransaction>;
export declare const RippleTransactionInfo: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    confirmationNumber: t.StringC;
}>]>, t.TypeC<{
    confirmationNumber: t.UnionC<[t.StringC, t.NullC]>;
}>]>;
export declare type RippleTransactionInfo = t.TypeOf<typeof RippleTransactionInfo>;
export declare const RippleBroadcastResult: t.IntersectionC<[t.TypeC<{
    id: t.StringC;
}>, t.TypeC<{
    rebroadcast: t.BooleanC;
    data: t.ObjectC;
}>]>;
export declare type RippleBroadcastResult = t.TypeOf<typeof RippleBroadcastResult>;
export declare const RippleCreateTransactionOptions: t.IntersectionC<[t.IntersectionC<[t.UnionC<[t.IntersectionC<[t.TypeC<{
    feeRate: t.StringC;
    feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
}>, t.PartialC<{
    feeLevel: t.LiteralC<import("@faast/payments-common").FeeLevel.Custom>;
}>]>, t.PartialC<{
    feeLevel: t.UnionC<[t.LiteralC<import("@faast/payments-common").FeeLevel.High>, t.LiteralC<import("@faast/payments-common").FeeLevel.Medium>, t.LiteralC<import("@faast/payments-common").FeeLevel.Low>]>;
}>]>, t.PartialC<{
    sequenceNumber: t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>;
    payportBalance: t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>;
    availableUtxos: t.ArrayC<t.IntersectionC<[t.TypeC<{
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
}>]>, t.PartialC<{
    maxLedgerVersionOffset: t.NumberC;
}>]>;
export declare type RippleCreateTransactionOptions = t.TypeOf<typeof RippleCreateTransactionOptions>;
export declare type FromToWithPayport = FromTo & {
    fromPayport: Payport;
    toPayport: Payport;
};
export declare type RippleSignatory = {
    address: string;
    secret: string | KeyPair;
};
