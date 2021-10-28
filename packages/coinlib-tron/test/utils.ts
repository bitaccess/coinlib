import { PACKAGE_NAME } from '../src/constants'
import { TestLogger } from '../../../common/testUtils'

export * from '../../../common/testUtils'
export const logger = new TestLogger(PACKAGE_NAME)
