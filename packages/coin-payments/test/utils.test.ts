import { keysOf } from '../src/utils'

describe('utils', () => {
  describe('keysOf', () => {
    it('works', () => {
      const result: ('a' | 'b' | 'c')[] = keysOf({ a: 1, b: 2, c: 5 })
      expect(result).toEqual(['a', 'b', 'c'])
    })
  })
})
