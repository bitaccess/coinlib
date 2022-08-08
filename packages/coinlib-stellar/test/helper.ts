import { HdStellarPayments, UHdStellarPayments } from '../src'


export function commonTests(
  payments: HdStellarPayments | UHdStellarPayments,
  addresses: { [key: number]: string },
  secrets: { [key: number]: string },
) {
  it('should not be readonly', () => {
    expect(payments.isReadOnly()).toBe(false)
  })
  it('getHotSignatory should return correct key pair', () => {
    const hotSignatory = payments.getHotSignatory()
    expect(hotSignatory.address).toBe(addresses[0])
    expect(hotSignatory.secret).toEqual(secrets[0])
  })
  it('getDepositSignatory should return correct key pair', () => {
    const hotSignatory = payments.getDepositSignatory()
    expect(hotSignatory.address).toBe(addresses[1])
    expect(hotSignatory.secret).toEqual(secrets[1])
  })
  it('getPublicConfig should return signatories', () => {
    const publicConfig = payments.getPublicConfig()
    expect(publicConfig).toEqual({
      hotAccount: addresses[0],
      depositAccount: addresses[1],
    })
  })
  it('getAccountIds should return addresses', () => {
    expect(payments.getAccountIds()).toEqual([addresses[0], addresses[1]])
  })
  describe('getAccountId', () => {
    it('should return address 0 for index 0', () => {
      expect(payments.getAccountId(0)).toBe(addresses[0])
    })
    for (let i = 1; i < 5; i++) {
      it(`should return address 1 for index ${i}`, () => {
        expect(payments.getAccountId(i)).toBe(addresses[1])
      })
    }
  })
}
