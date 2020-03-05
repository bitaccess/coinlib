import { NetworkType, UtxoInfo } from '@faast/payments-common';
import { BlockbookConnectedConfig } from './types';
import { BlockbookBitcoin } from 'blockbook-client';
import { Logger } from '@faast/ts-common';
export declare function resolveServer(server: BlockbookConnectedConfig['server'], network: NetworkType): {
    api: BlockbookBitcoin;
    server: string[] | null;
};
export declare function retryIfDisconnected<T>(fn: () => Promise<T>, api: BlockbookBitcoin, logger: Logger): Promise<T>;
export declare function estimateTxSize(inputsCount: number, outputsCount: number, handleSegwit: boolean): {
    min: number;
    max: number;
};
export declare function estimateTxFee(satPerByte: number, inputsCount: number, outputsCount: number, handleSegwit: boolean): number;
export declare function sortUtxos(utxoList: UtxoInfo[]): UtxoInfo[];
