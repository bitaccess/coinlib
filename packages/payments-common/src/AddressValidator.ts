import { NetworkType } from './types'

export interface AddressValidator {
  validate(address: string, network?: NetworkType, format?: string): boolean | Promise<boolean>
}
