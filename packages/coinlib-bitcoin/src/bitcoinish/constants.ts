import { FeeLevel } from '@bitaccess/coinlib-common'
import { FeeLevelBlockTargets, AddressType } from './types'

export const MIN_P2PKH_SWEEP_BYTES = 191

export const DEFAULT_FEE_LEVEL_BLOCK_TARGETS: FeeLevelBlockTargets = {
  [FeeLevel.High]: 1,
  [FeeLevel.Medium]: 24,
  [FeeLevel.Low]: 144,
}

export const BITCOINISH_ADDRESS_PURPOSE = {
  [AddressType.Legacy]: '44',
  [AddressType.SegwitP2SH]: '49',
  [AddressType.SegwitNative]: '84',
  [AddressType.MultisigLegacy]: '87',
  [AddressType.MultisigSegwitNative]: '87',
  [AddressType.MultisigSegwitP2SH]: '87'
}
