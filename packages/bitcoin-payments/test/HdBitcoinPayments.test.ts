import { NetworkType, FeeRateType } from '@faast/payments-common';

import {
  HdBitcoinPayments, HdBitcoinPaymentsConfig, AddressType, SinglesigAddressType,
} from '../src'

import { EXTERNAL_ADDRESS, accountsByAddressType, AccountFixture } from './fixtures'
import { logger, makeUtxos, makeOutputs } from './utils'
import { toBigNumber } from '@faast/ts-common'

jest.setTimeout(30 * 1000)

describe('HdBitcoinPayments', () => {

  describe('static', () => {
    it('should throw on invalid hdKey', () => {
      expect(() => new HdBitcoinPayments({ hdKey: 'invalid' })).toThrow()
    })
  })

  describe('buildPaymentTx', () => {
    const account = accountsByAddressType.p2wpkh
    const changeAddress = account.addresses[0]
    const feeMain = '0.001'
    const desiredFeeRate = { feeRate: feeMain, feeRateType: FeeRateType.Main }
    const minChange = '0.01'
    const targetUtxoPoolSize = 4
    const payments = new HdBitcoinPayments({
      hdKey: account.xpub,
      addressType: AddressType.SegwitNative,
      logger,
      minChange,
      targetUtxoPoolSize,
    })
    it('sweep from single confirmed utxo', async () => {
      const utxos = makeUtxos(['0.05'], ['0.06'])
      const outputs = [{ address: EXTERNAL_ADDRESS, value: '0.05' }]
      const paymentTx = await payments.buildPaymentTx({
        unusedUtxos: utxos,
        desiredOutputs: outputs,
        changeAddress,
        desiredFeeRate,
        useAllUtxos: true,
        useUnconfirmedUtxos: false,
      })
      const expectedOutputs = [{ address: EXTERNAL_ADDRESS, value: '0.049' }]
      expect(paymentTx.inputs).toEqual([utxos[0]])
      expect(paymentTx.outputs).toEqual(expectedOutputs)
      expect(paymentTx.changeOutputs).toEqual([])
      expect(paymentTx.externalOutputs).toEqual(expectedOutputs)
      expect(paymentTx.externalOutputTotal).toBe('0.049')
      expect(paymentTx.change).toBe('0')
      expect(paymentTx.changeAddress).toBe(null)
      expect(paymentTx.fee).toBe(feeMain)
    })
    it('sweep from multiple confirmed and unconfirmed utxo', async () => {
      const utxos = makeUtxos(['0.05', '0.1'], ['2.2'])
      const outputs = [{ address: EXTERNAL_ADDRESS, value: '2.35' }]
      const paymentTx = await payments.buildPaymentTx({
        unusedUtxos: utxos,
        desiredOutputs: outputs,
        changeAddress,
        desiredFeeRate,
        useAllUtxos: true,
        useUnconfirmedUtxos: true,
      })
      const expectedOutputs = [{ address: EXTERNAL_ADDRESS, value: '2.349' }]
      expect(paymentTx.inputs).toEqual(utxos)
      expect(paymentTx.outputs).toEqual(expectedOutputs)
      expect(paymentTx.changeOutputs).toEqual([])
      expect(paymentTx.externalOutputs).toEqual(expectedOutputs)
      expect(paymentTx.externalOutputTotal).toBe('2.349')
      expect(paymentTx.change).toBe('0')
      expect(paymentTx.changeAddress).toBe(null)
      expect(paymentTx.fee).toBe(feeMain)
    })
    it('send using single ideal utxo', async () => {
      const utxos = makeUtxos(['0.1', '0.8', '1.5'], ['3'])
      const outputs = [{ address: EXTERNAL_ADDRESS, value: '0.799' }]
      const paymentTx = await payments.buildPaymentTx({
        unusedUtxos: utxos,
        desiredOutputs: outputs,
        changeAddress,
        desiredFeeRate,
        useAllUtxos: false,
        useUnconfirmedUtxos: false,
      })
      expect(paymentTx.inputs).toEqual([utxos[1]])
      expect(paymentTx.outputs).toEqual(outputs)
      expect(paymentTx.changeOutputs).toEqual([])
      expect(paymentTx.externalOutputs).toEqual(outputs)
      expect(paymentTx.externalOutputTotal).toBe('0.799')
      expect(paymentTx.change).toBe('0')
      expect(paymentTx.changeAddress).toBe(null)
      expect(paymentTx.fee).toBe(feeMain)
    })
    it('send using multiple utxos with single small change output', async () => {
      const utxos = makeUtxos(['1', '1.001'], ['3'])
      const outputs = [{ address: EXTERNAL_ADDRESS, value: '1.995' }]
      const paymentTx = await payments.buildPaymentTx({
        unusedUtxos: utxos,
        desiredOutputs: outputs,
        changeAddress,
        desiredFeeRate,
        useAllUtxos: false,
        useUnconfirmedUtxos: false,
      })
      const changeOutputs = makeOutputs(changeAddress, '0.005')
      expect(paymentTx.inputs).toEqual(utxos.slice(0,2))
      expect(paymentTx.outputs).toEqual([...outputs, ...changeOutputs])
      expect(paymentTx.changeOutputs).toEqual(changeOutputs)
      expect(paymentTx.externalOutputs).toEqual(outputs)
      expect(paymentTx.externalOutputTotal).toBe('1.995')
      expect(paymentTx.change).toBe('0.005')
      expect(paymentTx.changeAddress).toBe(changeAddress)
      expect(paymentTx.fee).toBe(feeMain)
    })
    it('send using multiple utxos with multiple change outputs', async () => {
      const utxos = makeUtxos(['1', '1.001', '1.7'], ['4'])
      const outputs = [{ address: EXTERNAL_ADDRESS, value: '3' }]
      const paymentTx = await payments.buildPaymentTx({
        unusedUtxos: utxos,
        desiredOutputs: outputs,
        changeAddress,
        desiredFeeRate,
        useAllUtxos: false,
        useUnconfirmedUtxos: false,
      })
      const changeOutputs = makeOutputs(changeAddress, '0.1', '0.2', '0.4')
      expect(paymentTx.inputs).toEqual(utxos.slice(0,3))
      expect(paymentTx.outputs).toEqual([...outputs, ...changeOutputs])
      expect(paymentTx.changeOutputs).toEqual(changeOutputs)
      expect(paymentTx.externalOutputs).toEqual(outputs)
      expect(paymentTx.externalOutputTotal).toBe('3')
      expect(paymentTx.change).toBe('0.7')
      expect(paymentTx.changeAddress).toBe(null)
      expect(paymentTx.fee).toBe(feeMain)
    })
    it('change below dust threshold gets added to fee', async () => {
      const utxos = makeUtxos(['1', '1.001'])
      const outputs = [{ address: EXTERNAL_ADDRESS, value: '1.999999' }]
      const paymentTx = await payments.buildPaymentTx({
        unusedUtxos: utxos,
        desiredOutputs: outputs,
        changeAddress,
        desiredFeeRate,
        useAllUtxos: false,
        useUnconfirmedUtxos: false,
      })
      expect(paymentTx.inputs).toEqual(utxos)
      expect(paymentTx.outputs).toEqual(outputs)
      expect(paymentTx.changeOutputs).toEqual([])
      expect(paymentTx.externalOutputs).toEqual(outputs)
      expect(paymentTx.externalOutputTotal).toBe('1.999999')
      expect(paymentTx.change).toBe('0')
      expect(paymentTx.changeAddress).toBe(null)
      expect(paymentTx.fee).toBe(toBigNumber(feeMain).plus('0.000001').toString())
    })
  })

  for (let k in accountsByAddressType) {
    const addressType = k as SinglesigAddressType
    const accountFixture = accountsByAddressType[addressType]

    describe(addressType, () => {

      describe('hardcoded xpub', () => {
        const config: HdBitcoinPaymentsConfig = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new HdBitcoinPayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config: HdBitcoinPaymentsConfig = {
          hdKey: accountFixture.xprv,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new HdBitcoinPayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })
    })
  }
})

function runHardcodedPublicKeyTests(
  payments: HdBitcoinPayments,
  config: HdBitcoinPaymentsConfig,
  accountFixture: AccountFixture,
) {
  const { xpub, xprv, addresses, derivationPath } = accountFixture
  it('getFullConfig', () => {
    expect(payments.getFullConfig()).toEqual({
      hdKey: config.hdKey,
      network: config.network,
      derivationPath,
      addressType: config.addressType,
      logger,
    })
  })
  it('getPublicConfig', () => {
    expect(payments.getPublicConfig()).toEqual({
      hdKey: xpub,
      network: config.network,
      derivationPath,
      addressType: config.addressType,
    })
  })
  it('getAccountIds', () => {
    expect(payments.getAccountIds()).toEqual([xpub])
  })
  it('getAccountId for index 0', () => {
    expect(payments.getAccountId(0)).toEqual(xpub)
  })
  it('getAccountId for index 10', () => {
    expect(payments.getAccountId(10)).toEqual(xpub)
  })
  it('getXpub', async () => {
    expect(payments.xpub).toEqual(xpub)
  })
  for (let iString of Object.keys(accountFixture.addresses)) {
    const i = Number.parseInt(iString)
    it(`getPayport for index ${i}`, async () => {
      const actual = await payments.getPayport(i)
      expect(actual).toEqual({ address: addresses[i] })
    })
  }
  it('resolvePayport resolves for index 1', async () => {
    expect(await payments.resolvePayport(1)).toEqual({ address: addresses[1] })
  })
  it('resolvePayport resolves for address', async () => {
    expect(await payments.resolvePayport(addresses[1])).toEqual({ address: addresses[1] })
  })
  it('resolvePayport resolves for external address', async () => {
    expect(await payments.resolvePayport(EXTERNAL_ADDRESS)).toEqual({ address: EXTERNAL_ADDRESS })
  })
  it('resolvePayport resolves for payport', async () => {
    const payport = { address: addresses[1] }
    expect(await payments.resolvePayport(payport)).toEqual(payport)
  })
  it('resolvePayport throws for invalid address', async () => {
    await expect(payments.resolvePayport('invalid')).rejects.toThrow()
  })
  it('resolveFromTo is correct for (index, index)', async () => {
    expect(await payments.resolveFromTo(0, 2)).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: addresses[2],
      toIndex: 2,
      toExtraId: undefined,
      toPayport: { address: addresses[2] },
    })
  })
  it('resolveFromTo is correct for external address', async () => {
    expect(await payments.resolveFromTo(0, EXTERNAL_ADDRESS)).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: EXTERNAL_ADDRESS,
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: EXTERNAL_ADDRESS },
    })
  })
  it('resolveFromTo is correct for internal address', async () => {
    expect(await payments.resolveFromTo(0, addresses[2])).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: addresses[2],
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: addresses[2] },
    })
  })
  it('resolveFromTo throws for address as from', async () => {
    await expect(payments.resolveFromTo(EXTERNAL_ADDRESS as any, 0)).rejects.toThrow()
  })

  it('get a balance using an index', async () => {
    expect(await payments.getBalance(1)).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      unactivated: false,
    })
  })
  it('get a balance using an address', async () => {
    expect(await payments.getBalance({ address: addresses[0] })).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      unactivated: false,
    })
  })
}
