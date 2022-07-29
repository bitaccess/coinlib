import {
  sha3,
  deriveCreate1Address,
  deriveCreate2Address,
  deriveProxyCreate2Address,
} from "../src/utils"
import Web3 from 'web3'

const web3 = new Web3()

describe('utils', () => {
  describe('sha3', () => {
    it('calculates hash of public key', () => {
      expect(sha3('0x03cb206fc952ce006c4afb3c4d4ce19199b850d59cfd521d36ae212d4a7a97d7a4'))
        .toBe('0xe526dc81b9f0074ad3c3fdf7b4e1d7c380068c85512d384c85a5539151ac16d0')
    })
    it('calculates hash for hex string', () => {
      expect(sha3('0xabcd')).toBe(web3.utils.sha3('0xabcd'))
    })
    it('calculates hash for buffer', () => {
      expect(sha3(Buffer.from('abcd', 'hex'))).toBe(web3.utils.sha3('0xabcd'))
    })
    it('throws for invalid hex string', () => {
      expect(() => sha3('0xzzz')).toThrow()
    })
  })
  describe('deriveCreate1Address', () => {
    it('calculates address for lowercase sender', () => {
      expect(deriveCreate1Address('0x6ac7ea33f8831ea9dcc53393aaa88b25a785dbf0', 0))
        .toBe('0xcd234a471b72ba2f1ccf0a70fcaba648a5eecd8d')
    })
    it('calculates address for checksum sender', () => {
      expect(deriveCreate1Address('0xBa75Ae10D3869185Cd406B48A17a7262FC3da945', 5199))
        .toBe('0x7119222b42c5841674d4b38cf1350f5b885ccade')
    })
    it('throws for invalid address', () => {
      expect(() => deriveCreate1Address('blah', 1)).toThrow()
    })
    it('throws for invalid nonce', () => {
      expect(() => deriveCreate1Address('0xba75ae10d3869185cd406b48a17a7262fc3da945', -1)).toThrow()
    })
  })
  describe('deriveCreate2Address', () => {
    it('calculates address correctly', () => {
      // https://ropsten.etherscan.io/tx/0xe2722550786c41ba107e42f6617092fc556b841e1e41a9420d1239bf8f24fe91
      expect(deriveCreate2Address(
        '0xada9fbf6356cdfb6d29b13d8104d263a076d76b9',
        '0x2734b3b18f22fbf117ab59344f3f32328335591e13bc5bb9b5812d15dc5e2a31',
        '0x3d602d80600a3d3981f3363d3d373d3d3d363d73ada9fbf6356cdfb6d29b13d8104d263a076d76b95af43d82803e903d91602b57fd5bf3',
      )).toBe('0xe9c229f432bad2a011fc7a22455cd1027e5c4228')
    })
  })
  describe('deriveProxyCreate2Address', () => {
    // https://ropsten.etherscan.io/tx/0xe2722550786c41ba107e42f6617092fc556b841e1e41a9420d1239bf8f24fe91
    it('calculates address correctly', () => {
      expect(deriveProxyCreate2Address(
        '0xada9fbf6356cdfb6d29b13d8104d263a076d76b9',
        '0x2734b3b18f22fbf117ab59344f3f32328335591e13bc5bb9b5812d15dc5e2a31',
      )).toBe('0xe9c229f432bad2a011fc7a22455cd1027e5c4228')
    })

    // https://ropsten.etherscan.io/tx/0xf85a69153952813df3dbf8ed35d6a7d22a989b46a3315c3dc40330f10cd5df50
    // salt is hashed public key at index 1563
    it('calculates address correctly with salt', () => {
      expect(deriveProxyCreate2Address(
        '0x7119222b42c5841674d4b38cf1350f5b885ccade',
        '0xe526dc81b9f0074ad3c3fdf7b4e1d7c380068c85512d384c85a5539151ac16d0',
      )).toBe('0xf1e488dd5fd0927afc858211689bc3842367b00e')
    })
    it('calculates address correctly with hashed public key', () => {
      expect(deriveProxyCreate2Address(
        '0x7119222b42c5841674d4b38cf1350f5b885ccade',
        sha3('0x03cb206fc952ce006c4afb3c4d4ce19199b850d59cfd521d36ae212d4a7a97d7a4'),
      )).toBe('0xf1e488dd5fd0927afc858211689bc3842367b00e')
    })

    // From end to end tests
    expect(deriveProxyCreate2Address(
      '0x5B31D375304BcF4116d45CDE3093ebc7aAf696fe',
      '0xd79f1072d281d90be78b260312370988be6951cd8f53e2bb1e91f3c8f9d75a25',
    )).toBe('0xda65e9e8461a6e8b9f2906133a5fa8c21f24da99')
  })
})
