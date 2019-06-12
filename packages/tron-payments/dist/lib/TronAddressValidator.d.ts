import { AddressValidator } from '@faast/payments-common';
import { isValidAddress } from './utils';
export declare class TronAddressValidator implements AddressValidator {
    validate: typeof isValidAddress;
}
