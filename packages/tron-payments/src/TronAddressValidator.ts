import { AddressValidator } from '@faast/payments-common'
import { isValidAddress } from './utils'

export class TronAddressValidator implements AddressValidator {
  validate = isValidAddress
}
