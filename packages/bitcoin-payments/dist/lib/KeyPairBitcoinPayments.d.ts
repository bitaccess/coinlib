import { SinglesigBitcoinPayments } from './SinglesigBitcoinPayments';
import { KeyPairBitcoinPaymentsConfig, BitcoinjsKeyPair } from './types';
export declare class KeyPairBitcoinPayments extends SinglesigBitcoinPayments<KeyPairBitcoinPaymentsConfig> {
    private config;
    readonly publicKeys: {
        [index: number]: string | undefined;
    };
    readonly privateKeys: {
        [index: number]: string | null | undefined;
    };
    readonly addresses: {
        [index: number]: string | undefined;
    };
    constructor(config: KeyPairBitcoinPaymentsConfig);
    getFullConfig(): KeyPairBitcoinPaymentsConfig;
    getPublicConfig(): KeyPairBitcoinPaymentsConfig;
    getAccountId(index: number): string;
    getAccountIds(index?: number): string[];
    getKeyPair(index: number): BitcoinjsKeyPair;
    getAddress(index: number): string;
    getPrivateKey(index: number): string;
}
export default KeyPairBitcoinPayments;
