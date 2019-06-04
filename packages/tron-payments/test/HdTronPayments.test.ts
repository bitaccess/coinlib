import fs from 'fs'
import path from 'path'
import { omit } from 'lodash'

import { HdTronPayments } from '#/HdTronPayments'
import { TronTransactionInfo } from '#/types'

import { txInfo_209F8, signedTx_valid, txInfo_a0787, signedTx_invalid } from './fixtures/transactions'
import { hdAccount } from './fixtures/accounts'
import { HdTronPaymentsConfig } from '../src/types'

const { XPRV, XPUB, PRIVATE_KEYS, ADDRESSES } = hdAccount

const EXTERNAL_ADDRESS = 'TW22XzVixyFZU5DxQJwxqXuKfNKFNMLqJ2'

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs
    .readFileSync(secretXprvFilePath)
    .toString('utf8')
    .trim()
  console.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  console.log(
    `File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`,
  )
}

const txInfoOmitEquality = ['data.currentBlock', 'confirmations']
function assertTxInfo(actual: TronTransactionInfo, expected: TronTransactionInfo): void {
  expect(omit(actual, txInfoOmitEquality)).toEqual(omit(expected, txInfoOmitEquality))
}

function runHardcodedPublicKeyTests(tp: HdTronPayments, config: HdTronPaymentsConfig) {
  it('getFullConfig', () => {
    expect(tp.getFullConfig()).toBe(config)
  })
  it('getPublicConfig', () => {
    expect(tp.getPublicConfig()).toEqual({
      ...config,
      hdKey: XPUB,
    })
  })
  it('getAccountIds', () => {
    expect(tp.getAccountIds()).toEqual([XPUB])
  })
  it('getAccountId for index 0', () => {
    expect(tp.getAccountId(0)).toEqual(XPUB)
  })
  it('getAccountId for index 10', () => {
    expect(tp.getAccountId(10)).toEqual(XPUB)
  })
  it('getXpub', async () => {
    expect(tp.getXpub()).toBe(XPUB)
  })
  it('getAddress for index 1', async () => {
    expect(await tp.getAddress(1)).toBe(ADDRESSES[1])
  })
  it('getAddress for high index', async () => {
    expect(await tp.getAddress(10000)).toBe(ADDRESSES[10000])
  })
  it('getAddressIndex for address at index 1', async () => {
    expect(await tp.getAddressIndex(ADDRESSES[1])).toBe(1)
  })
  it('getAddressIndex for address that is uncached but scannable', async () => {
    expect(await tp.getAddressIndex(ADDRESSES[10])).toBe(10)
  })
  it('getAddressIndex for address that was cached by getAddress', async () => {
    expect(await tp.getAddressIndex(ADDRESSES[10000])).toBe(10000)
  })
  it('getAddressIndexOrNull returns address at index 1', async () => {
    expect(await tp.getAddressIndexOrNull(ADDRESSES[1])).toBe(1)
  })
  it('getAddressIndexOrNull returns null for external address', async () => {
    expect(await tp.getAddressIndexOrNull(EXTERNAL_ADDRESS)).toBe(null)
  })
  it('throw on getAddressIndex for address that is uncached and unscannable', async () => {
    await expect(tp.getAddressIndex(ADDRESSES[20000])).rejects.toThrowError()
  })
  it('throw on getAddressIndex for external address', async () => {
    await expect(tp.getAddressIndex(EXTERNAL_ADDRESS)).rejects.toThrowError()
  })
  it('resolveAddress resolves for index 1', async () => {
    expect(await tp.resolveAddress(1)).toBe(ADDRESSES[1])
  })
  it('resolveAddress resolves for address 1', async () => {
    expect(await tp.resolveAddress(ADDRESSES[1])).toBe(ADDRESSES[1])
  })
  it('resolveAddress resolves for external address', async () => {
    expect(await tp.resolveAddress(EXTERNAL_ADDRESS)).toBe(EXTERNAL_ADDRESS)
  })
  it('resolveAddress throws for invalid address', async () => {
    await expect(tp.resolveAddress('invalid')).rejects.toThrow()
  })
  it('resolveFromTo is correct for (index, index)', async () => {
    expect(await tp.resolveFromTo(0, 2)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      toAddress: ADDRESSES[2],
      toIndex: 2,
    })
  })
  it('resolveFromTo is correct for (index, internal address)', async () => {
    expect(await tp.resolveFromTo(0, ADDRESSES[2])).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      toAddress: ADDRESSES[2],
      toIndex: 2,
    })
  })
  it('resolveFromTo is correct for (index, external address)', async () => {
    expect(await tp.resolveFromTo(0, EXTERNAL_ADDRESS)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      toAddress: EXTERNAL_ADDRESS,
      toIndex: null,
    })
  })
  it('resolveFromTo is correct for (internal address, index)', async () => {
    expect(await tp.resolveFromTo(ADDRESSES[0], 2)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      toAddress: ADDRESSES[2],
      toIndex: 2,
    })
  })
  it('resolveFromTo is correct for (internal address, internal address)', async () => {
    expect(await tp.resolveFromTo(ADDRESSES[0], ADDRESSES[2])).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      toAddress: ADDRESSES[2],
      toIndex: 2,
    })
  })
  it('resolveFromTo is correct for (internal address, external address)', async () => {
    expect(await tp.resolveFromTo(ADDRESSES[0], EXTERNAL_ADDRESS)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      toAddress: EXTERNAL_ADDRESS,
      toIndex: null,
    })
  })
  it('resolveFromTo throws for external address as from', async () => {
    await expect(tp.resolveFromTo(EXTERNAL_ADDRESS, 0)).rejects.toThrow()
  })

  it('get transaction by hash with a fee', async () => {
    const tx = await tp.getTransactionInfo('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c')
    assertTxInfo(tx, txInfo_209F8)
  })
  it('get transaction by hash without a fee', async () => {
    const tx = await tp.getTransactionInfo('a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39')
    assertTxInfo(tx, txInfo_a0787)
  })
  it('fail to get an invalid transaction hash', async () => {
    await expect(tp.getTransactionInfo('123456abcdef')).rejects.toThrow('Transaction not found')
  })

  it('get a balance using xpub and index', async () => {
    expect(await tp.getBalance(1)).toEqual({
      balance: '0',
      unconfirmedBalance: '0',
    })
  })
  it('get a balance using an address', async () => {
    expect(await tp.getBalance('TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26')).toEqual({
      balance: '0',
      unconfirmedBalance: '0',
    })
  })
  it('broadcast an existing sweep transaction', async () => {
    const result = await tp.broadcastTransaction(signedTx_valid)
    expect(result).toEqual({
      id: signedTx_valid.id,
      rebroadcast: true,
    })
  })
  it('broadcast should fail on invalid tx', async () => {
    await expect(tp.broadcastTransaction(signedTx_invalid)).rejects.toThrow('Failed to broadcast transaction: ')
  })
}

describe('HdTronPayments', () => {
  describe('static', () => {
    it('generateNewKeys should return xprv and xpub', async () => {
      let keys = HdTronPayments.generateNewKeys()
      expect(keys.xpub).toMatch(/^xpub\w{107}/)
      expect(keys.xprv).toMatch(/^xprv\w{107}/)
    })
    it('should throw on invalid hdKey', () => {
      expect(() => new HdTronPayments({ hdKey: 'invalid' })).toThrow()
    })
  })

  describe('hardcoded xpub', () => {
    const config = {
      hdKey: XPUB,
      maxAddressScan: 12,
    }
    const tp = new HdTronPayments(config)

    runHardcodedPublicKeyTests(tp, config)

    it('getPrivateKey throws', async () => {
      await expect(tp.getPrivateKey(1)).rejects.toThrow()
    })
  })

  describe('hardcoded xprv', () => {
    const config = {
      hdKey: XPRV,
      maxAddressScan: 12,
    }
    const tp = new HdTronPayments(config)

    runHardcodedPublicKeyTests(tp, config)

    it('getPrivateKey returns private key 1', async () => {
      expect(await tp.getPrivateKey(1)).toBe(PRIVATE_KEYS[1])
    })
  })

  if (secretXprv) {
    describe('secret xprv', () => {
      const tp = new HdTronPayments({
        hdKey: secretXprv,
      })
      const address0 = 'TWc9zTvsBwZB2nLBNjuUiNSTyaNtDo53vi'
      const address3 = 'TVjvkL65TGV7Lp3Dit2kPCigHVd1aSVyVw'
      const xpub =
        'xpub6CGU5e4iDEBeFaeRU9AqFkaPcu8R4uJ2po2yvmEWaGsCzjBkw3PyivDXw2oZERairTNUN6C726UQSkr8f9tDe2UC88LQRBerTcw86zxZJHf'

      it('get correct xpub', async () => {
        expect(tp.getXpub()).toBe(xpub)
      })
      it('get correct address for index 0', async () => {
        expect(await tp.getAddress(0)).toBe(address0)
      })
      it('get correct address for index 3', async () => {
        expect(await tp.getAddress(3)).toBe(address3)
      })
      it('get correct balance for index 0', async () => {
        expect(await tp.getBalance(0)).toEqual({
          balance: '0.6',
          unconfirmedBalance: '0',
        })
      })
      it('get correct balance for address 0', async () => {
        expect(await tp.getBalance(address0)).toEqual({
          balance: '0.6',
          unconfirmedBalance: '0',
        })
      })

      it('generate a sweep transaction using indices', async () => {
        const signedTx = await tp.createSweepTransaction(0, 3)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe('0.5')
        expect(signedTx.fromAddress).toBe(address0)
        expect(signedTx.toAddress).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('generate a sweep transaction using internal addresses', async () => {
        const signedTx = await tp.createSweepTransaction(address0, address3)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe('0.5')
        expect(signedTx.fromAddress).toBe(address0)
        expect(signedTx.toAddress).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('generate a sweep transaction to an external address', async () => {
        const signedTx = await tp.createSweepTransaction(0, EXTERNAL_ADDRESS)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe('0.5')
        expect(signedTx.fromAddress).toBe(address0)
        expect(signedTx.toAddress).toBe(EXTERNAL_ADDRESS)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(null)
      })

      it('generate a send transaction using indices', async () => {
        const amount = '0.3'
        const signedTx = await tp.createTransaction(0, 3, amount)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe(amount)
        expect(signedTx.fromAddress).toBe(address0)
        expect(signedTx.toAddress).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('generate a send transaction using internal addresses', async () => {
        const amount = '0.3'
        const signedTx = await tp.createTransaction(address0, address3, amount)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe(amount)
        expect(signedTx.fromAddress).toBe(address0)
        expect(signedTx.toAddress).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('generate a sweep transaction to an external address', async () => {
        const amount = '0.3'
        const signedTx = await tp.createTransaction(0, EXTERNAL_ADDRESS, amount)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe(amount)
        expect(signedTx.fromAddress).toBe(address0)
        expect(signedTx.toAddress).toBe(EXTERNAL_ADDRESS)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(null)
      })

      it('end to end sweep', async () => {
        const indicesToTry = [5, 6]
        let indexToSweep: number = -1
        for (const index of indicesToTry) {
          if (await tp.canSweep(index)) {
            indexToSweep = index
            break
          }
        }
        if (indexToSweep < 0) {
          const allAddresses = await Promise.all(indicesToTry.map(i => tp.getAddress(i)))
          console.log(
            'Cannot end to end test sweeping due to lack of funds. Send TRX to any of the following addresses and try again.',
            allAddresses,
          )
          return
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        try {
          const unsignedTx = await tp.createSweepTransaction(indexToSweep, recipientIndex)
          const signedTx = await tp.signTransaction(unsignedTx)
          console.log(`Sweeping ${signedTx.amount} TRX from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
          expect(await tp.broadcastTransaction(signedTx)).toEqual({
            id: signedTx.id,
            rebroadcast: false,
          })
        } catch (e) {
          if ((e.message || (e as string)).includes('Validate TransferContract error, balance is not sufficient')) {
            console.log('Ran consecutive tests too soon, previous sweep not complete. Wait a minute and retry')
          }
          throw e
        }
      })
    })
  }
})
