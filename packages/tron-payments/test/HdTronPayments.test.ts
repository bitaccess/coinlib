import fs from 'fs'
import path from 'path'
import { omit } from 'lodash'

import { HdTronPayments } from '#/HdTronPayments'
import { TransactionInfo } from '#/types'

import { txInfo_209F8, signedTx_78f92, txInfo_a0787 } from './fixtures/transactions'
import { hdAccount } from './fixtures/accounts'

const { XPRV, XPUB, PRIVATE_KEYS, ADDRESSES } = hdAccount

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs.readFileSync(secretXprvFilePath).toString('utf8').trim()
  console.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  console.log(`File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`)
}

const txInfoOmitEquality = ['raw.currentBlock', 'confirmations']
function assertTxInfo(actual: TransactionInfo, expected: TransactionInfo): void {
  expect(omit(actual, txInfoOmitEquality)).toEqual(omit(expected, txInfoOmitEquality))
}

describe('HdTronPayments', () => {
  describe('static', () => {
    it('generateNewKeys should return xprv and xpub', async () => {
      let keys = HdTronPayments.generateNewKeys()
      expect(keys.xpub).toMatch(/^xpub\w{107}/)
      expect(keys.xprv).toMatch(/^xprv\w{107}/)
    })
  })

  describe('hardcoded xprv', () => {
    const tp = new HdTronPayments({
      hdKey: XPRV,
      maxAddressScan: 12,
    })

    it('getXpub', async () => {
      expect(tp.getXpub()).toBe(XPUB)
    })
    it('privateKeyToAddress', async () => {
      expect(tp.privateKeyToAddress(PRIVATE_KEYS[1])).toBe(ADDRESSES[1])
    })
    it('getPrivateKey for index 1', async () => {
      expect(await tp.getPrivateKey(1)).toBe(PRIVATE_KEYS[1])
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
    it('throw on getAddressIndex for address that is uncached and unscannable', async () => {
      await expect(tp.getAddressIndex(ADDRESSES[20000]))
        .rejects.toThrowError()
    })
    it('throw on getAddressIndex for unknown address', async () => {
      await expect(tp.getAddressIndex('TFY4gcYj8Mftd3HHRBwV1DgJHQEFuG8S7v'))
        .rejects.toThrowError()
    })

    // This test takes a long time. It really just makes sure we don't have padding
    // issues in a brute force way.
    it.skip('generate 1000 addresses and private keys, make sure they match', async () => {
      let tasks = []
      for (let i = 4000; i < 5000; i++) {
        let address = await tp.getAddress(i)
        let privateKey = await tp.getPrivateKey(i)
        let addressFromPkey = tp.privateKeyToAddress(privateKey)
        if (address !== addressFromPkey) {
          throw new Error(`key mismatch: ${address}, ${privateKey}, ${addressFromPkey}`)
        }
      }
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
      await expect(tp.getTransactionInfo('123456abcdef'))
        .rejects.toThrow('Transaction not found')
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
      const result = await tp.broadcastTransaction(signedTx_78f92)
      expect(result).toEqual({
        id: signedTx_78f92.id
      })
    })
  })

  if (secretXprv) {
    describe('secret xprv', () => {
      const tp = new HdTronPayments({
        hdKey: secretXprv,
      })
      const address0 = 'TWc9zTvsBwZB2nLBNjuUiNSTyaNtDo53vi'
      const address3 = 'TVjvkL65TGV7Lp3Dit2kPCigHVd1aSVyVw'
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
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('generate a send transaction using indices', async () => {
        const amount = '0.3'
        const signedTx = await tp.createTransaction(0, 3, amount)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe(amount)
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('generate a sweep transaction using indices', async () => {
        const signedTx = await tp.createSweepTransaction(address0, address3)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe('0.5')
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('generate a send transaction using indices', async () => {
        const amount = '0.3'
        const signedTx = await tp.createTransaction(address0, address3, amount)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe(amount)
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
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
          const allAddresses = await Promise.all(indicesToTry.map((i) => tp.getAddress(i)))
          console.log('Cannot end to end test sweeping due to lack of funds. Send TRX to any of the following addresses and try again.', allAddresses)
          return
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const signedTx = await tp.createSweepTransaction(indexToSweep, recipientIndex)
        console.log(`Sweeping ${signedTx.amount} TRX from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await tp.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
      })
    })
  }
})
