import * as t from 'io-ts';
export declare const baseAssetConfigCodecs: {
    TRX: t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>;
    XRP: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        maxLedgerVersionOffset: t.NumberC;
    }>]>;
    XLM: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        txTimeoutSeconds: t.NumberC;
    }>]>;
    BTC: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>;
    ETH: t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.UnionC<[t.StringC, t.UndefinedC]>;
        parityNode: t.UnionC<[t.StringC, t.UndefinedC]>;
        gasStation: t.UnionC<[t.StringC, t.UndefinedC]>;
    }>]>;
};
export declare const CoinPaymentsBaseAssetConfigs: t.TypeC<{
    TRX: t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.StringC;
        solidityNode: t.StringC;
        eventServer: t.StringC;
    }>]>;
    XRP: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/ripple-payments").RippleServerAPI, import("@faast/ripple-payments").RippleServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        maxLedgerVersionOffset: t.NumberC;
    }>]>;
    XLM: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.Type<import("@faast/stellar-payments").StellarServerAPI, import("@faast/stellar-payments").StellarServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        txTimeoutSeconds: t.NumberC;
    }>]>;
    BTC: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>;
    ETH: t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        fullNode: t.UnionC<[t.StringC, t.UndefinedC]>;
        parityNode: t.UnionC<[t.StringC, t.UndefinedC]>;
        gasStation: t.UnionC<[t.StringC, t.UndefinedC]>;
    }>]>;
}>;
export declare type CoinPaymentsBaseAssetConfigs = t.TypeOf<typeof CoinPaymentsBaseAssetConfigs>;
export declare const assetConfigCodecs: {
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
    BTC: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
        derivationPath: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        m: t.NumberC;
        signers: t.ArrayC<t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
            network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
            logger: import("@faast/ts-common").LoggerC;
        }>, t.PartialC<{
            server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
        }>]>, t.PartialC<{
            minTxFee: t.TypeC<{
                feeRate: t.StringC;
                feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
            }>;
            dustThreshold: t.NumberC;
            networkMinRelayFee: t.NumberC;
            targetUtxoPoolSize: t.NumberC;
            minChange: t.StringC;
            maximumFeeRate: t.NumberC;
        }>]>, t.TypeC<{
            hdKey: t.StringC;
        }>, t.PartialC<{
            addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
            derivationPath: t.StringC;
        }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
            network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
            logger: import("@faast/ts-common").LoggerC;
        }>, t.PartialC<{
            server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
        }>]>, t.PartialC<{
            minTxFee: t.TypeC<{
                feeRate: t.StringC;
                feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
            }>;
            dustThreshold: t.NumberC;
            networkMinRelayFee: t.NumberC;
            targetUtxoPoolSize: t.NumberC;
            minChange: t.StringC;
            maximumFeeRate: t.NumberC;
        }>]>, t.TypeC<{
            keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
        }>, t.PartialC<{
            addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
        }>]>]>>;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.MultisigLegacy | import("@faast/bitcoin-payments").AddressType.MultisigSegwitP2SH | import("@faast/bitcoin-payments").AddressType.MultisigSegwitNative, import("@faast/bitcoin-payments").AddressType.MultisigLegacy | import("@faast/bitcoin-payments").AddressType.MultisigSegwitP2SH | import("@faast/bitcoin-payments").AddressType.MultisigSegwitNative, unknown>;
    }>]>]>;
    ETH: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
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
};
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
    BTC: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
        derivationPath: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        m: t.NumberC;
        signers: t.ArrayC<t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
            network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
            logger: import("@faast/ts-common").LoggerC;
        }>, t.PartialC<{
            server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
        }>]>, t.PartialC<{
            minTxFee: t.TypeC<{
                feeRate: t.StringC;
                feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
            }>;
            dustThreshold: t.NumberC;
            networkMinRelayFee: t.NumberC;
            targetUtxoPoolSize: t.NumberC;
            minChange: t.StringC;
            maximumFeeRate: t.NumberC;
        }>]>, t.TypeC<{
            hdKey: t.StringC;
        }>, t.PartialC<{
            addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
            derivationPath: t.StringC;
        }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
            network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
            logger: import("@faast/ts-common").LoggerC;
        }>, t.PartialC<{
            server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
        }>]>, t.PartialC<{
            minTxFee: t.TypeC<{
                feeRate: t.StringC;
                feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
            }>;
            dustThreshold: t.NumberC;
            networkMinRelayFee: t.NumberC;
            targetUtxoPoolSize: t.NumberC;
            minChange: t.StringC;
            maximumFeeRate: t.NumberC;
        }>]>, t.TypeC<{
            keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
        }>, t.PartialC<{
            addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
        }>]>]>>;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.MultisigLegacy | import("@faast/bitcoin-payments").AddressType.MultisigSegwitP2SH | import("@faast/bitcoin-payments").AddressType.MultisigSegwitNative, import("@faast/bitcoin-payments").AddressType.MultisigLegacy | import("@faast/bitcoin-payments").AddressType.MultisigSegwitP2SH | import("@faast/bitcoin-payments").AddressType.MultisigSegwitNative, unknown>;
    }>]>]>;
    ETH: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
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
}>;
export declare type CoinPaymentsAssetConfigs = t.TypeOf<typeof CoinPaymentsAssetConfigs>;
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
    BTC: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        hdKey: t.StringC;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
        derivationPath: t.StringC;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
    }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
        network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
        logger: import("@faast/ts-common").LoggerC;
    }>, t.PartialC<{
        server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
    }>]>, t.PartialC<{
        minTxFee: t.TypeC<{
            feeRate: t.StringC;
            feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
        }>;
        dustThreshold: t.NumberC;
        networkMinRelayFee: t.NumberC;
        targetUtxoPoolSize: t.NumberC;
        minChange: t.StringC;
        maximumFeeRate: t.NumberC;
    }>]>, t.TypeC<{
        m: t.NumberC;
        signers: t.ArrayC<t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
            network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
            logger: import("@faast/ts-common").LoggerC;
        }>, t.PartialC<{
            server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
        }>]>, t.PartialC<{
            minTxFee: t.TypeC<{
                feeRate: t.StringC;
                feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
            }>;
            dustThreshold: t.NumberC;
            networkMinRelayFee: t.NumberC;
            targetUtxoPoolSize: t.NumberC;
            minChange: t.StringC;
            maximumFeeRate: t.NumberC;
        }>]>, t.TypeC<{
            hdKey: t.StringC;
        }>, t.PartialC<{
            addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
            derivationPath: t.StringC;
        }>]>, t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
            network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
            logger: import("@faast/ts-common").LoggerC;
        }>, t.PartialC<{
            server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("@faast/bitcoin-payments").BlockbookServerAPI, import("@faast/bitcoin-payments").BlockbookServerAPI, unknown>, t.NullC]>;
        }>]>, t.PartialC<{
            minTxFee: t.TypeC<{
                feeRate: t.StringC;
                feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
            }>;
            dustThreshold: t.NumberC;
            networkMinRelayFee: t.NumberC;
            targetUtxoPoolSize: t.NumberC;
            minChange: t.StringC;
            maximumFeeRate: t.NumberC;
        }>]>, t.TypeC<{
            keyPairs: t.UnionC<[t.ArrayC<t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>, t.RecordC<t.NumberC, t.UnionC<[t.StringC, t.NullC, t.UndefinedC]>>]>;
        }>, t.PartialC<{
            addressType: t.Type<import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, import("@faast/bitcoin-payments").AddressType.Legacy | import("@faast/bitcoin-payments").AddressType.SegwitP2SH | import("@faast/bitcoin-payments").AddressType.SegwitNative, unknown>;
        }>]>]>>;
    }>, t.PartialC<{
        addressType: t.Type<import("@faast/bitcoin-payments").AddressType.MultisigLegacy | import("@faast/bitcoin-payments").AddressType.MultisigSegwitP2SH | import("@faast/bitcoin-payments").AddressType.MultisigSegwitNative, import("@faast/bitcoin-payments").AddressType.MultisigLegacy | import("@faast/bitcoin-payments").AddressType.MultisigSegwitP2SH | import("@faast/bitcoin-payments").AddressType.MultisigSegwitNative, unknown>;
    }>]>]>;
    ETH: t.UnionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
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
}>;
export declare type SupportedCoinPaymentsSymbol = t.TypeOf<typeof SupportedCoinPaymentsSymbol>;
export declare type CoinPaymentsPartialAssetConfigs = {
    [T in SupportedCoinPaymentsSymbol]?: Partial<CoinPaymentsAssetConfigs[T]>;
};
export declare const CoinPaymentsPartialAssetConfigs: t.Type<CoinPaymentsPartialAssetConfigs, CoinPaymentsPartialAssetConfigs, unknown>;
export declare const CoinPaymentsConfig: t.IntersectionC<[t.Type<CoinPaymentsPartialAssetConfigs, CoinPaymentsPartialAssetConfigs, unknown>, t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
    seed: t.StringC;
}>]>;
export declare type CoinPaymentsConfig = t.TypeOf<typeof CoinPaymentsConfig>;
