import { PaymentsUtils, BaseConfig, NetworkType, Payport } from '@faast/payments-common';
import { isValidXprv, isValidXpub, isValidPrivateKey, privateKeyToAddress } from './helpers';
import { Logger } from '@faast/ts-common';
export declare class TronPaymentsUtils implements PaymentsUtils {
    networkType: NetworkType;
    logger: Logger;
    constructor(config?: BaseConfig);
    isValidExtraId(extraId: string): Promise<boolean>;
    isValidAddress(address: string): Promise<boolean>;
    isValidPayport(payport: Payport): Promise<boolean>;
    toMainDenomination(amount: string | number): string;
    toBaseDenomination(amount: string | number): string;
    isValidXprv: typeof isValidXprv;
    isValidXpub: typeof isValidXpub;
    isValidPrivateKey: typeof isValidPrivateKey;
    privateKeyToAddress: typeof privateKeyToAddress;
}
