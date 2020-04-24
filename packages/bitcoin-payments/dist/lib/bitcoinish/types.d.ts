import * as t from 'io-ts';
import { FeeRate, AutoFeeLevels, UtxoInfo } from '@faast/payments-common';
import { Numeric } from '@faast/ts-common';
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib';
import { BlockbookBitcoin, BlockInfoBitcoin } from 'blockbook-client';
export { BitcoinjsNetwork, UtxoInfo };
export declare class BlockbookServerAPI extends BlockbookBitcoin {
}
export declare const BlockbookConfigServer: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<BlockbookServerAPI, BlockbookServerAPI, unknown>, t.NullC]>;
export declare type BlockbookConfigServer = t.TypeOf<typeof BlockbookConfigServer>;
export declare const BlockbookConnectedConfig: t.IntersectionC<[t.TypeC<{
    network: t.Type<import("@faast/payments-common").NetworkType, import("@faast/payments-common").NetworkType, unknown>;
    server: t.UnionC<[t.StringC, t.ArrayC<t.StringC>, t.Type<BlockbookServerAPI, BlockbookServerAPI, unknown>, t.NullC]>;
}>, t.PartialC<{
    logger: t.UnionC<[import("@faast/ts-common").LoggerC, t.NullC]>;
}>]>;
export declare type BlockbookConnectedConfig = t.TypeOf<typeof BlockbookConnectedConfig>;
export declare type BitcoinishPaymentsUtilsConfig = BlockbookConnectedConfig & {
    coinSymbol: string;
    coinName: string;
    bitcoinjsNetwork: BitcoinjsNetwork;
    decimals: number;
};
export declare type BitcoinishPaymentsConfig = BitcoinishPaymentsUtilsConfig & {
    minTxFee: FeeRate;
    dustThreshold: number;
    networkMinRelayFee: number;
    defaultFeeLevel: AutoFeeLevels;
    targetUtxoPoolSize?: number;
    minChange?: Numeric;
};
export declare const BitcoinishTxOutput: t.TypeC<{
    address: t.StringC;
    value: t.StringC;
}>;
export declare type BitcoinishTxOutput = t.TypeOf<typeof BitcoinishTxOutput>;
export declare const BitcoinishTxOutputSatoshis: t.TypeC<{
    address: t.StringC;
    satoshis: t.NumberC;
}>;
export declare type BitcoinishTxOutputSatoshis = t.TypeOf<typeof BitcoinishTxOutputSatoshis>;
export declare const BitcoinishWeightedChangeOutput: t.TypeC<{
    address: t.StringC;
    weight: t.NumberC;
}>;
export declare type BitcoinishWeightedChangeOutput = t.TypeOf<typeof BitcoinishWeightedChangeOutput>;
export declare const BitcoinishPaymentTx: t.IntersectionC<[t.TypeC<{
    inputs: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        satoshis: t.UnionC<[t.NumberC, t.StringC]>;
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
    rawHex: t.StringC;
    rawHash: t.StringC;
}>]>;
export declare type BitcoinishPaymentTx = t.TypeOf<typeof BitcoinishPaymentTx>;
export declare const BitcoinishUnsignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    inputUtxos: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        satoshis: t.UnionC<[t.NumberC, t.StringC]>;
        confirmations: t.NumberC;
        height: t.StringC;
        lockTime: t.StringC;
        coinbase: t.BooleanC;
    }>]>>;
    externalOutputs: t.ArrayC<t.IntersectionC<[t.TypeC<{
        address: t.StringC;
        value: t.StringC;
    }>, t.PartialC<{
        extraId: t.UnionC<[t.StringC, t.NullC]>;
    }>]>>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
}>, t.PartialC<{
    multisigData: t.TypeC<{
        m: t.NumberC;
        accountIds: t.ArrayC<t.StringC>;
        publicKeys: t.ArrayC<t.StringC>;
        signedAccountIds: t.ArrayC<t.StringC>;
    }>;
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
            satoshis: t.UnionC<[t.NumberC, t.StringC]>;
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
        rawHex: t.StringC;
        rawHash: t.StringC;
    }>]>;
}>]>;
export declare type BitcoinishUnsignedTransaction = t.TypeOf<typeof BitcoinishUnsignedTransaction>;
export declare const BitcoinishSignedTransaction: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    inputUtxos: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        satoshis: t.UnionC<[t.NumberC, t.StringC]>;
        confirmations: t.NumberC;
        height: t.StringC;
        lockTime: t.StringC;
        coinbase: t.BooleanC;
    }>]>>;
    externalOutputs: t.ArrayC<t.IntersectionC<[t.TypeC<{
        address: t.StringC;
        value: t.StringC;
    }>, t.PartialC<{
        extraId: t.UnionC<[t.StringC, t.NullC]>;
    }>]>>;
}>]>, t.TypeC<{
    fromAddress: t.StringC;
    toAddress: t.StringC;
    fromIndex: t.NumberC;
    targetFeeLevel: t.Type<import("@faast/payments-common").FeeLevel, import("@faast/payments-common").FeeLevel, unknown>;
    targetFeeRate: t.UnionC<[t.StringC, t.NullC]>;
    targetFeeRateType: t.UnionC<[t.Type<import("@faast/payments-common").FeeRateType, import("@faast/payments-common").FeeRateType, unknown>, t.NullC]>;
}>, t.PartialC<{
    multisigData: t.TypeC<{
        m: t.NumberC;
        accountIds: t.ArrayC<t.StringC>;
        publicKeys: t.ArrayC<t.StringC>;
        signedAccountIds: t.ArrayC<t.StringC>;
    }>;
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
export declare type BitcoinishSignedTransaction = t.TypeOf<typeof BitcoinishSignedTransaction>;
export declare const BitcoinishTransactionInfo: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
    inputUtxos: t.ArrayC<t.IntersectionC<[t.TypeC<{
        txid: t.StringC;
        vout: t.NumberC;
        value: t.StringC;
    }>, t.PartialC<{
        satoshis: t.UnionC<[t.NumberC, t.StringC]>;
        confirmations: t.NumberC;
        height: t.StringC;
        lockTime: t.StringC;
        coinbase: t.BooleanC;
    }>]>>;
    externalOutputs: t.ArrayC<t.IntersectionC<[t.TypeC<{
        address: t.StringC;
        value: t.StringC;
    }>, t.PartialC<{
        extraId: t.UnionC<[t.StringC, t.NullC]>;
    }>]>>;
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
    currentBlockNumber: t.UnionC<[t.StringC, t.NumberC]>;
    confirmationNumber: t.UnionC<[t.StringC, t.NumberC]>;
}>]>;
export declare type BitcoinishTransactionInfo = t.TypeOf<typeof BitcoinishTransactionInfo>;
export declare const BitcoinishBroadcastResult: t.TypeC<{
    id: t.StringC;
}>;
export declare type BitcoinishBroadcastResult = t.TypeOf<typeof BitcoinishBroadcastResult>;
export declare const BitcoinishBlock: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
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
export declare type BitcoinishBlock = BlockInfoBitcoin;
export declare const PayportOutput: t.TypeC<{
    payport: t.UnionC<[t.IntersectionC<[t.TypeC<{
        address: t.StringC;
    }>, t.PartialC<{
        extraId: t.UnionC<[t.StringC, t.NullC]>;
    }>]>, t.StringC, t.NumberC]>;
    amount: t.UnionC<[t.StringC, t.NumberC, import("@faast/ts-common").BigNumberC]>;
}>;
export declare type PayportOutput = t.TypeOf<typeof PayportOutput>;
