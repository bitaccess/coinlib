import { PaymentsErrorCode, PaymentsError } from '../src/errors'

describe('errors', () => {
  describe('PaymentsError', () => {
    const testMessage = 'test message'
    const basic = new PaymentsError(PaymentsErrorCode.TxExpired)
    const basicMessage = new PaymentsError(PaymentsErrorCode.TxExpired, testMessage)
    const cause = new Error(testMessage)
    const basicCause = new PaymentsError(PaymentsErrorCode.TxExpired, cause)

    it('is instanceof Error', () => {
      expect(basic).toBeInstanceOf(Error)
    })
    it('has name', () => {
      expect(basic.name).toBe('PaymentsError')
    })
    it('has no message when not provided', () => {
      expect(basic.message).toBeFalsy()
    })
    it('has correct message when string provided', () => {
      expect(basicMessage.message).toBe(testMessage)
    })
    it('has correct message when error provided', () => {
      expect(basicCause.message).toBe(`caused by Error: ${testMessage}`)
    })
    it('returns correct string representation without message', () => {
      expect(basic.toString()).toBe(`PaymentsError(${PaymentsErrorCode.TxExpired})`)
    })
    it('returns correct string representation with message', () => {
      expect(basicMessage.toString()).toBe(`PaymentsError(${PaymentsErrorCode.TxExpired}): ${testMessage}`)
    })
    it('returns correct string representation with cause', () => {
      expect(basicCause.toString()).toBe(`PaymentsError(${PaymentsErrorCode.TxExpired}): caused by ${cause}`)
    })
  })
})
