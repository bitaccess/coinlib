import { BitcoinishPaymentsUtils } from './bitcoinish';
import { BitcoinPaymentsUtilsConfig } from './types';
export declare class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
    constructor(config?: BitcoinPaymentsUtilsConfig);
    isValidAddress(address: string): Promise<boolean>;
    isValidPrivateKey(privateKey: string): Promise<boolean>;
}
