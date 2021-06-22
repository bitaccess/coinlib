import { PACKAGE_NAME } from '../src/constants'

export * from '../../../common/testUtils'
import { TestLogger } from '../../../common/testUtils'
export const logger = new TestLogger(PACKAGE_NAME)
