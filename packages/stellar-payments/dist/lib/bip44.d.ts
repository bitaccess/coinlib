import { StellarSignatory } from './types';
export declare function deriveSignatory(seed: string, index: number): StellarSignatory;
export declare function generateMnemonic(): string;
export declare function mnemonicToSeed(mnemonic: string): string;
