import { PaymentsErrorCode, PaymentsError } from '../src'

describe('errors', () => {
  describe('PaymentsError', () => {
    const code = PaymentsErrorCode.TxExpired
    const testMessage = 'test message'
    const basic = new PaymentsError(code)
    const basicMessage = new PaymentsError(code, testMessage)
    const cause = new Error(testMessage)
    const basicCause = new PaymentsError(code, cause)

    it('is instanceof Error', () => {
      expect(basic).toBeInstanceOf(Error)
    })
    it('has name', () => {
      expect(basic.name).toBe('PaymentsError')
    })
    it('has no message when not provided', () => {
      expect(basic.message).toBe(code)
    })
    it('has correct message when string provided', () => {
      expect(basicMessage.message).toBe(`${code} - ${testMessage}`)
    })
    it('has correct message when error provided', () => {
      expect(basicCause.message).toBe(`${code} - ${cause}`)
    })
    it('returns correct string representation without message', () => {
      expect(basic.toString()).toBe(`PaymentsError: ${code}`)
    })
    it('returns correct string representation with message', () => {
      expect(basicMessage.toString()).toBe(`PaymentsError: ${code} - ${testMessage}`)
    })
    it('returns correct string representation with cause', () => {
      expect(basicCause.toString()).toBe(`PaymentsError: ${code} - ${cause}`)
    })
  })
})
