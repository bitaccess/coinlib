import * as t from 'io-ts';
import { UtxoInfo } from '@faast/payments-common';
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib';
import { BlockInfoBitcoin } from 'blockbook-client';
export { BitcoinjsNetwork, UtxoInfo };
export * from './bitcoinish/types';
export declare enum AddressType {
    Legacy = "p2pkh",
    SegwitP2SH = "p2sh-p2wpkh",
    SegwitNative = "p2wpkh"
}
export declare const AddressTypeT: t.Type<AddressType, AddressType, unknown>;
export declare const BitcoinPaymentsUtilsConfig: t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("./bitcoinish").BlockbookServerAPI, import("./bitcoinish").BlockbookServerAPI, unknown>, t.NullC]>;
}>]>;
export declare type BitcoinPaymentsUtilsConfig = t.TypeOf<typeof BitcoinPaymentsUtilsConfig>;
export declare const BaseBitcoinPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("./bitcoinish").BlockbookServerAPI, import("./bitcoinish").BlockbookServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    addressType: t.Type<AddressType, AddressType, unknown>;
    minTxFee: t.TypeC<{
        feeRate: t.StringC;
        feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
    }>;
    dustThreshold: t.NumberC;
    networkMinRelayFee: t.NumberC;
    targetUtxoPoolSize: t.NumberC;
    minChange: t.StringC;
}>]>;
export declare type BaseBitcoinPaymentsConfig = t.TypeOf<typeof BaseBitcoinPaymentsConfig>;
export declare const HdBitcoinPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("./bitcoinish").BlockbookServerAPI, import("./bitcoinish").BlockbookServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    addressType: t.Type<AddressType, AddressType, unknown>;
    minTxFee: t.TypeC<{
        feeRate: t.StringC;
        feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
    }>;
    dustThreshold: t.NumberC;
    networkMinRelayFee: t.NumberC;
    targetUtxoPoolSize: t.NumberC;
    minChange: t.StringC;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>, t.PartialC<{
    derivationPath: t.StringC;
}>]>;
export declare type HdBitcoinPaymentsConfig = t.TypeOf<typeof HdBitcoinPaymentsConfig>;
export declare const BitcoinPaymentsConfig: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.PartialC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    logger: import("@faast/ts-common").LoggerC;
}>, t.PartialC<{
    server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<import("./bitcoinish").BlockbookServerAPI, import("./bitcoinish").BlockbookServerAPI, unknown>, t.NullC]>;
}>]>, t.PartialC<{
    addressType: t.Type<AddressType, AddressType, unknown>;
    minTxFee: t.TypeC<{
        feeRate: t.StringC;
        feeRateType: t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>;
    }>;
    dustThreshold: t.NumberC;
    networkMinRelayFee: t.NumberC;
    targetUtxoPoolSize: t.NumberC;
    minChange: t.StringC;
}>]>, t.TypeC<{
    hdKey: t.StringC;
}>, t.PartialC<{
    derivationPath: t.StringC;
}>]>;
export declare type BitcoinPaymentsConfig = t.TypeOf<typeof BitcoinPaymentsConfig>;
export declare const BitcoinUnsignedTransactionData: t.IntersectionC<[t.TypeC<{
    inputs: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        satoshis: t.NumberC;
        confirmations: t.NumberC;
        height: t.StringC;
        lockTime: t.StringC;
        coinbase: t.BooleanC;
    }>]>>;
    outputs: t.ArrayC<t.TypeC<{
        address: t.StringC;
        value: t.StringC;
    }>>;
    fee: t.StringC;
    change: t.StringC;
    changeAddress: t.UnionC<[t.StringC, t.NullC]>;
}>, t.PartialC<{
    externalOutputs: t.ArrayC<t.TypeC<{
        address: t.StringC;
        value: t.StringC;
    }>>;
    externalOutputTotal: t.StringC;
    changeOutputs: t.ArrayC<t.TypeC<{
        address: t.StringC;
        value: t.StringC;
    }>>;
}>]>;
export declare type BitcoinUnsignedTransactionData = t.TypeOf<typeof BitcoinUnsignedTransactionData>;
export declare const BitcoinUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
        satoshis: t.NumberC;
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
    data: t.IntersectionC<[t.TypeC<{
        inputs: t.ArrayC<t.IntersectionC<[t.TypeC<{
            txid: t.StringC;
            vout: t.NumberC;
            value: t.StringC;
        }>, t.PartialC<{
            satoshis: t.NumberC;
            confirmations: t.NumberC;
            height: t.StringC;
            lockTime: t.StringC;
            coinbase: t.BooleanC;
        }>]>>;
        outputs: t.ArrayC<t.TypeC<{
            address: t.StringC;
            value: t.StringC;
        }>>;
        fee: t.StringC;
        change: t.StringC;
        changeAddress: t.UnionC<[t.StringC, t.NullC]>;
    }>, t.PartialC<{
        externalOutputs: t.ArrayC<t.TypeC<{
            address: t.StringC;
            value: t.StringC;
        }>>;
        externalOutputTotal: t.StringC;
        changeOutputs: t.ArrayC<t.TypeC<{
            address: t.StringC;
            value: t.StringC;
        }>>;
    }>]>;
}>]>;
export declare type BitcoinUnsignedTransaction = t.TypeOf<typeof BitcoinUnsignedTransaction>;
export declare const BitcoinSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
        satoshis: t.NumberC;
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
export declare type BitcoinSignedTransaction = t.TypeOf<typeof BitcoinSignedTransaction>;
export declare const BitcoinTransactionInfo: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
export declare type BitcoinTransactionInfo = t.TypeOf<typeof BitcoinTransactionInfo>;
export declare const BitcoinBroadcastResult: t.TypeC<{
    id: t.StringC;
}>;
export declare type BitcoinBroadcastResult = t.TypeOf<typeof BitcoinBroadcastResult>;
export declare const BitcoinBlock: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    hash: t.StringC;
    height: t.NumberC;
    confirmations: t.NumberC;
    size: t.NumberC;
    version: t.NumberC;
    merkleRoot: t.StringC;
    nonce: t.StringC;
    bits: t.StringC;
    difficulty: t.StringC;
    txCount: t.NumberC;
    page: t.NumberC;
    totalPages: t.NumberC;
    itemsOnPage: t.NumberC;
}>, t.PartialC<{
    previousBlockHash: t.StringC;
    nextBlockHash: t.StringC;
    time: t.NumberC;
    txs: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vin: t.ArrayC<t.IntersectionC<[t.TypeC<{
            n: t.NumberC;
        }>, t.PartialC<{
            txid: t.StringC;
            vout: t.NumberC;
            sequence: t.NumberC;
            addresses: t.ArrayC<t.StringC>;
            value: t.StringC;
            hex: t.StringC;
            asm: t.StringC;
            coinbase: t.StringC;
            isAddress: t.BooleanC;
        }>]>>;
        vout: t.ArrayC<t.IntersectionC<[t.TypeC<{
            n: t.NumberC;
            addresses: t.ArrayC<t.StringC>;
        }>, t.PartialC<{
            value: t.StringC;
            spent: t.BooleanC;
            spentTxId: t.StringC;
            spentIndex: t.NumberC;
            spentHeight: t.NumberC;
            hex: t.StringC;
            asm: t.StringC;
            type: t.StringC;
            isAddress: t.BooleanC;
        }>]>>;
        blockHeight: t.NumberC;
        confirmations: t.NumberC;
        blockTime: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        version: t.NumberC;
        lockTime: t.NumberC;
        blockHash: t.StringC;
        size: t.NumberC;
        valueIn: t.StringC;
        fees: t.StringC;
        hex: t.StringC;
        tokenTransfers: t.ArrayC<t.TypeC<{
            type: t.StringC;
            from: t.StringC;
            to: t.StringC;
            token: t.StringC;
            name: t.StringC;
            symbol: t.StringC;
            decimals: t.NumberC;
            value: t.StringC;
        }>>;
        ethereumSpecific: t.TypeC<{
            status: t.NumberC;
            nonce: t.NumberC;
            gasLimit: t.NumberC;
            gasUsed: t.NumberC;
            gasPrice: t.StringC;
        }>;
    }>]>>;
}>]>, t.PartialC<{
    txs: t.ArrayC<t.IntersectionC<[t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vin: t.ArrayC<t.IntersectionC<[t.TypeC<{
            n: t.NumberC;
        }>, t.PartialC<{
            txid: t.StringC;
            vout: t.NumberC;
            sequence: t.NumberC;
            addresses: t.ArrayC<t.StringC>;
            value: t.StringC;
            hex: t.StringC;
            asm: t.StringC;
            coinbase: t.StringC;
            isAddress: t.BooleanC;
        }>]>>;
        vout: t.ArrayC<t.IntersectionC<[t.TypeC<{
            n: t.NumberC;
            addresses: t.ArrayC<t.StringC>;
        }>, t.PartialC<{
            value: t.StringC;
            spent: t.BooleanC;
            spentTxId: t.StringC;
            spentIndex: t.NumberC;
            spentHeight: t.NumberC;
            hex: t.StringC;
            asm: t.StringC;
            type: t.StringC;
            isAddress: t.BooleanC;
        }>]>>;
        blockHeight: t.NumberC;
        confirmations: t.NumberC;
        blockTime: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        version: t.NumberC;
        lockTime: t.NumberC;
        blockHash: t.StringC;
        size: t.NumberC;
        valueIn: t.StringC;
        fees: t.StringC;
        hex: t.StringC;
        tokenTransfers: t.ArrayC<t.TypeC<{
            type: t.StringC;
            from: t.StringC;
            to: t.StringC;
            token: t.StringC;
            name: t.StringC;
            symbol: t.StringC;
            decimals: t.NumberC;
            value: t.StringC;
        }>>;
        ethereumSpecific: t.TypeC<{
            status: t.NumberC;
            nonce: t.NumberC;
            gasLimit: t.NumberC;
            gasUsed: t.NumberC;
            gasPrice: t.StringC;
        }>;
    }>]>, t.TypeC<{
        vin: t.ArrayC<t.IntersectionC<[t.IntersectionC<[t.TypeC<{
            n: t.NumberC;
        }>, t.PartialC<{
            txid: t.StringC;
            vout: t.NumberC;
            sequence: t.NumberC;
            addresses: t.ArrayC<t.StringC>;
            value: t.StringC;
            hex: t.StringC;
            asm: t.StringC;
            coinbase: t.StringC;
            isAddress: t.BooleanC;
        }>]>, t.TypeC<{
            value: t.StringC;
        }>]>>;
        vout: t.ArrayC<t.IntersectionC<[t.IntersectionC<[t.TypeC<{
            n: t.NumberC;
            addresses: t.ArrayC<t.StringC>;
        }>, t.PartialC<{
            value: t.StringC;
            spent: t.BooleanC;
            spentTxId: t.StringC;
            spentIndex: t.NumberC;
            spentHeight: t.NumberC;
            hex: t.StringC;
            asm: t.StringC;
            type: t.StringC;
            isAddress: t.BooleanC;
        }>]>, t.TypeC<{
            value: t.StringC;
        }>]>>;
        valueIn: t.StringC;
        fees: t.StringC;
    }>]>>;
}>]>;
export declare type BitcoinBlock = BlockInfoBitcoin;
