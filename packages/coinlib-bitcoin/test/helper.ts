import { FeeRateType } from '@bitaccess/coinlib-common'
import { makeUtxos, makeOutputs, expectUtxosEqual, logger } from './utils'
import { toBigNumber } from '@bitaccess/ts-common'
import {
  HdBitcoinPayments,
  UHdBitcoinPayments,
  HdBitcoinPaymentsConfig,
} from '../src'
import {
  EXTERNAL_ADDRESS,
  AccountFixture,
  SeedAccountFixture,
} from './fixtures'

export function runBuildPaymentTxTests(
  payments: HdBitcoinPayments | UHdBitcoinPayments,
  account: AccountFixture | SeedAccountFixture,
) {
  const changeAddress = account.addresses[0]
  const feeMain = '0.001'
  const desiredFeeRate = { feeRate: feeMain, feeRateType: FeeRateType.Main }
  it('sweep from single confirmed utxo', async () => {
    const utxos = makeUtxos(['0.05'], ['0.06'])
    const outputs = [{ address: EXTERNAL_ADDRESS, value: '0.05' }]
    const paymentTx = await payments.buildPaymentTx({
      enforcedUtxos: [],
      unusedUtxos: utxos,
      desiredOutputs: outputs,
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: true,
      useUnconfirmedUtxos: false,
      recipientPaysFee: false,
      maxFeePercent: 50,
    })
    const expectedOutputs = [{ address: EXTERNAL_ADDRESS, value: '0.049' }]
    expectUtxosEqual(paymentTx.inputs, [utxos[0]])
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
      enforcedUtxos: [],
      unusedUtxos: utxos,
      desiredOutputs: outputs,
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: true,
      useUnconfirmedUtxos: true,
      recipientPaysFee: false,
      maxFeePercent: 50,
    })
    const expectedOutputs = [{ address: EXTERNAL_ADDRESS, value: '2.349' }]
    expectUtxosEqual(paymentTx.inputs, utxos)
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
      enforcedUtxos: [],
      unusedUtxos: utxos,
      desiredOutputs: outputs,
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: false,
      maxFeePercent: 50,
    })
    expectUtxosEqual(paymentTx.inputs, [utxos[1]])
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
      enforcedUtxos: [],
      unusedUtxos: utxos,
      desiredOutputs: outputs,
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: false,
      maxFeePercent: 50,
    })
    const changeOutputs = makeOutputs(changeAddress, '0.005')
    expectUtxosEqual(paymentTx.inputs, utxos.slice(0, 2))
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
      enforcedUtxos: [],
      unusedUtxos: utxos,
      desiredOutputs: outputs,
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: false,
      maxFeePercent: 50,
    })
    const changeOutputs = makeOutputs(changeAddress, '0.1', '0.2', '0.4')
    expectUtxosEqual(paymentTx.inputs, utxos.slice(0, 3))
    expect(paymentTx.outputs).toEqual([...outputs, ...changeOutputs])
    expect(paymentTx.changeOutputs).toEqual(changeOutputs)
    expect(paymentTx.externalOutputs).toEqual(outputs)
    expect(paymentTx.externalOutputTotal).toBe('3')
    expect(paymentTx.change).toBe('0.7')
    expect(paymentTx.changeAddress).toBe(null)
    expect(paymentTx.fee).toBe(feeMain)
  })
  it('send using multiple utxos and one forced with multiple change outputs', async () => {
    const utxos = makeUtxos(['1', '1.001', '1.7'], ['4'])
    const outputs = [{ address: EXTERNAL_ADDRESS, value: '3' }]
    const paymentTx = await payments.buildPaymentTx({
      enforcedUtxos: [utxos[0]],
      unusedUtxos: [utxos[1], utxos[2]],
      desiredOutputs: outputs,
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: false,
      maxFeePercent: 50,
    })
    const changeOutputs = makeOutputs(changeAddress, '0.1', '0.2', '0.4')
    expect(paymentTx.inputs.includes(utxos[0]))
    expect(paymentTx.externalOutputs).toEqual(outputs)
    expect(paymentTx.externalOutputTotal).toBe('3')
    expect(paymentTx.changeAddress).toBe(null)
  })
  it('change below dust threshold gets added to fee', async () => {
    const utxos = makeUtxos(['1', '1.001'])
    const outputs = [{ address: EXTERNAL_ADDRESS, value: '1.999999' }]
    const paymentTx = await payments.buildPaymentTx({
      enforcedUtxos: [],
      unusedUtxos: utxos,
      desiredOutputs: outputs,
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: false,
      maxFeePercent: 50,
    })
    expectUtxosEqual(paymentTx.inputs, utxos)
    expect(paymentTx.outputs).toEqual(outputs)
    expect(paymentTx.changeOutputs).toEqual([])
    expect(paymentTx.externalOutputs).toEqual(outputs)
    expect(paymentTx.externalOutputTotal).toBe('1.999999')
    expect(paymentTx.change).toBe('0')
    expect(paymentTx.changeAddress).toBe(null)
    expect(paymentTx.fee).toBe(
      toBigNumber(feeMain)
        .plus('0.000001')
        .toString(),
    )
  })
  it('loose change below dust threshold gets added to first change output', async () => {
    // This test is designed to have 3 change outputs and 1 satoshi loose change that gets allocated
    // to the first change output
    const unusedUtxos = makeUtxos(['1', '1.00000001'])
    const amount = '1.93'
    const paymentTx = await payments.buildPaymentTx({
      enforcedUtxos: [],
      unusedUtxos,
      desiredOutputs: [{ address: EXTERNAL_ADDRESS, value: amount }],
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: true,
      maxFeePercent: 50,
    })
    expectUtxosEqual(paymentTx.inputs, unusedUtxos.slice(0, 2))
    const expectedOutputAmount = toBigNumber(amount)
      .minus(feeMain)
      .toString()
    const expectedExternalOutputs = [
      {
        address: EXTERNAL_ADDRESS,
        value: expectedOutputAmount,
      },
    ]
    const expectedChangeOutputs = [
      {
        address: changeAddress,
        value: '0.01000001',
      },
      {
        address: changeAddress,
        value: '0.02',
      },
      {
        address: changeAddress,
        value: '0.04',
      },
    ]
    expect(paymentTx.outputs).toEqual([...expectedExternalOutputs, ...expectedChangeOutputs])
    expect(paymentTx.externalOutputs).toEqual(expectedExternalOutputs)
    expect(paymentTx.changeOutputs).toEqual(expectedChangeOutputs)
    expect(paymentTx.externalOutputTotal).toBe(expectedOutputAmount)
    expect(paymentTx.change).toBe('0.07000001')
    expect(paymentTx.changeAddress).toBe(null)
    expect(paymentTx.fee).toBe(feeMain)
  })
  it('loose change below dust threshold gets added to fee when there are no change outputs', async () => {
    // This test is designed to have no change outputs and 1 satoshi loose change that gets allocated
    // to the fee without further deducting the output amount
    const unusedUtxos = makeUtxos(['1', '1.00000001'])
    const amount = '2'
    const paymentTx = await payments.buildPaymentTx({
      enforcedUtxos: [],
      unusedUtxos,
      desiredOutputs: [{ address: EXTERNAL_ADDRESS, value: amount }],
      changeAddress: [changeAddress],
      desiredFeeRate,
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: true,
      maxFeePercent: 50,
    })
    expectUtxosEqual(paymentTx.inputs, unusedUtxos)
    const expectedOutputAmount = toBigNumber(amount)
      .minus(feeMain)
      .toString()
    const expectedExternalOutputs = [
      {
        address: EXTERNAL_ADDRESS,
        value: expectedOutputAmount,
      },
    ]
    expect(paymentTx.outputs).toEqual([...expectedExternalOutputs])
    expect(paymentTx.externalOutputs).toEqual(expectedExternalOutputs)
    expect(paymentTx.changeOutputs).toEqual([])
    expect(paymentTx.externalOutputTotal).toBe(expectedOutputAmount)
    expect(paymentTx.change).toBe('0')
    expect(paymentTx.changeAddress).toBe(null)
    expect(paymentTx.fee).toBe(
      toBigNumber(feeMain)
        .plus(1e-8)
        .toString(),
    )
  })
  it('recalculated dynamic fee doesnt create loose change when recipient pays fee', async () => {
    const unusedUtxos = makeUtxos(['1', '1.00000001'])
    const amount = '1.93'
    const paymentTx = await payments.buildPaymentTx({
      enforcedUtxos: [],
      unusedUtxos,
      desiredOutputs: [{ address: EXTERNAL_ADDRESS, value: amount }],
      changeAddress: [changeAddress],
      desiredFeeRate: {
        feeRate: '100',
        // Important: Must use sat/byte because so recalculated fee is different after change outputs are dropped
        feeRateType: FeeRateType.BasePerWeight,
      },
      useAllUtxos: false,
      useUnconfirmedUtxos: false,
      recipientPaysFee: true,
      maxFeePercent: 50,
    })
    expectUtxosEqual(paymentTx.inputs, unusedUtxos.slice(0, 2))
    const expectedOutputAmount = toBigNumber(amount)
      .minus(paymentTx.fee)
      .toString()
    const expectedExternalOutputs = [
      {
        address: EXTERNAL_ADDRESS,
        value: expectedOutputAmount,
      },
    ]
    const expectedChangeOutputs = [
      {
        address: changeAddress,
        value: '0.01000001',
      },
      {
        address: changeAddress,
        value: '0.02',
      },
      {
        address: changeAddress,
        value: '0.04',
      },
    ]
    expect(paymentTx.outputs).toEqual([...expectedExternalOutputs, ...expectedChangeOutputs])
    expect(paymentTx.externalOutputs).toEqual(expectedExternalOutputs)
    expect(paymentTx.changeOutputs).toEqual(expectedChangeOutputs)
    expect(paymentTx.externalOutputTotal).toBe(expectedOutputAmount)
    expect(paymentTx.change).toBe('0.07000001')
    expect(paymentTx.changeAddress).toBe(null)
    const expectedFee = toBigNumber(paymentTx.inputTotal)
      .minus(paymentTx.externalOutputTotal)
      .minus(paymentTx.change)
      .toString()
    expect(paymentTx.fee).toBe(expectedFee)
  })

  it('estimateTxSize provides correct estimate when address has multiple external outputs', () => {
    expect(payments.estimateTxSize(1, 1, [EXTERNAL_ADDRESS, EXTERNAL_ADDRESS, EXTERNAL_ADDRESS])).toBe(211)
  })
}

export function runHardcodedPublicKeyTests(
  payments: HdBitcoinPayments | UHdBitcoinPayments,
  config: HdBitcoinPaymentsConfig,
  accountFixture: AccountFixture | SeedAccountFixture,
) {
  const { xpub, addresses, derivationPath } = accountFixture
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
  for (const iString of Object.keys(accountFixture.addresses)) {
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
      requiresActivation: false,
    })
  })
  it('get a balance using an address', async () => {
    expect(await payments.getBalance({ address: addresses[0] })).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
    })
  })
}
