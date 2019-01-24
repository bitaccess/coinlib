import MoneroPayments from '../src'

const fakeNode = 'http://localhost:1234'

const fakeTx = {
  id: 'fakeId',
  from: 'fromAddr',
  to: 'toAddr',
  amount: '1',
  feeRate: 10,
  fee: '0.0001',
  data: {},
}

const fakeTxStatus = {
  ...fakeTx,
  block: 1234,
  confirmations: 5,
}

describe('MoneroPayments', () => {
  describe('static', () => {
    test('MoneroPayments is instantiable', () => {
      expect(new MoneroPayments({
        paymentsNode: fakeNode,
        network: 'mainnet'
      })).toBeInstanceOf(MoneroPayments)
    })
    test('MoneroPayments is instantiable without network field', () => {
      expect(new MoneroPayments({
        paymentsNode: fakeNode
      })).toBeInstanceOf(MoneroPayments)
    })
    test('isValidAddress returns false', () => {
      expect(MoneroPayments.isValidAddress('fake')).toBe(false)
    })
  })
  describe('instance', () => {
    let mp: MoneroPayments
    beforeEach(() => {
      mp = new MoneroPayments({
        paymentsNode: fakeNode,
        network: 'mainnet'
      })
    })
    test('getAddress without index', () => {
      expect(mp.getAddress()).toBe('')
    })
    test('getAddress with index', () => {
      expect(mp.getAddress(0)).toBe('')
    })
    test('getBalance', async () => {
      expect(await mp.getBalance(0)).toBe('')
    })
    test('getTransactionStatus', async () => {
      expect(await mp.getTransactionStatus('fakeId')).toBe(null)
    })
    test('createTransaction', async () => {
      expect(await mp.createTransaction(0, '', '')).toBe(null)
    })
    test('createSweepTransaction', async () => {
      expect(await mp.createSweepTransaction(0, '')).toBe(null)
    })
    test('broadcastTransaction', async () => {
      expect(await mp.broadcastTransaction(fakeTx))
    })
  })
})
