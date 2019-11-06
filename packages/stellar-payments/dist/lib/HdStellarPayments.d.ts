import { HdStellarPaymentsConfig } from './types';
import { generateMnemonic } from './bip44';
import { AccountStellarPayments } from './AccountStellarPayments';
export declare class HdStellarPayments extends AccountStellarPayments {
    readonly seed: string;
    constructor({ seed, ...config }: HdStellarPaymentsConfig);
    static generateMnemonic: typeof generateMnemonic;
}
