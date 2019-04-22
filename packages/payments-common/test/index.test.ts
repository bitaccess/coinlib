import { PaymentsInterface, PaymentsFactory } from '../src'

describe('payments-common', () => {
  it('should define PaymentsInterface', () => {
    expect(PaymentsInterface).toBeDefined()
  })
  it('should defined PaymentsFactory', () => {
    expect(PaymentsFactory).toBeDefined()
  })
})
