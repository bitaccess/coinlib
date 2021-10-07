import { FeeLevel } from '@bitaccess/coinlib-common'
import { FeeLevelBlockTargets } from './types'

export const DEFAULT_FEE_LEVEL_BLOCK_TARGETS: FeeLevelBlockTargets = {
  [FeeLevel.High]: 1,
  [FeeLevel.Medium]: 24,
  [FeeLevel.Low]: 144,
}
