import MoneroPayments from '../src'

describe('MoneroPayments', () => {
  it('MoneroPayments is instantiable', () => {
    expect(new MoneroPayments({
      paymentsNode: ''
    })).toBeInstanceOf(MoneroPayments)
  })
})
