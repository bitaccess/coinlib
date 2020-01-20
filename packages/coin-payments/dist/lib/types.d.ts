import * as t from 'io-ts';
export declare const CoinPaymentsAssetConfigs: t.TypeC<{
    TRX: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>, t.TypeC<{
        keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
    }>]>]>;
    XRP: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        maxLedgerVersionOffset: t.NumberC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
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
    XLM: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        txTimeoutSeconds: t.NumberC;
    }>]>, t.TypeC<{
        seed: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
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
}>;
export declare type CoinPaymentsAssetConfigs = t.TypeOf<typeof CoinPaymentsAssetConfigs>;
export declare const CoinPaymentsConfig: t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
    seed: t.StringC;
    TRX: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>, t.TypeC<{
        keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
    }>]>]>;
    XRP: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        maxLedgerVersionOffset: t.NumberC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
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
    XLM: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        txTimeoutSeconds: t.NumberC;
    }>]>, t.TypeC<{
        seed: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
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
}>;
export declare type CoinPaymentsConfig = t.TypeOf<typeof CoinPaymentsConfig>;
export declare const SupportedCoinPaymentsSymbol: t.KeyofC<{
    TRX: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>, t.TypeC<{
        keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
    }>]>]>;
    XRP: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        maxLedgerVersionOffset: t.NumberC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
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
    XLM: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        txTimeoutSeconds: t.NumberC;
    }>]>, t.TypeC<{
        seed: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
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
}>;
export declare type SupportedCoinPaymentsSymbol = t.TypeOf<typeof SupportedCoinPaymentsSymbol>;
