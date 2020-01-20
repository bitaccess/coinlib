import { NetworkType, FeeLevel } from '@faast/payments-common';
import { BaseBitcoinPaymentsConfig } from './types';
import { BitcoinishPaymentsConfig } from './bitcoinish';
export declare function bip32MagicNumberToPrefix(magicNum: number): string;
export declare function toBitcoinishConfig<T extends BaseBitcoinPaymentsConfig>(config: T): BitcoinishPaymentsConfig;
export declare function getBlockcypherFeeEstimate(feeLevel: FeeLevel, networkType: NetworkType): Promise<number>;
