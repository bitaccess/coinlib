import { isMatchingError, isString, Logger } from '@faast/ts-common'
import { BlockbookEthereum, NormalizedTxEthereum } from 'blockbook-client'
import promiseRetry from 'promise-retry'
import { buffToHex, hexToBuff, numericToHex, strip0x, prepend0x } from '@bitaccess/coinlib-common'
import { rlp, keccak256 } from 'ethereumjs-util'

import { EthereumBlockbookConnectedConfig } from './types'
import { ETHEREUM_ADDRESS_REGEX, TOKEN_PROXY_DATA, WELL_FORMED_HEX_REGEX } from './constants'

export { buffToHex, hexToBuff, numericToHex, strip0x, prepend0x }

const RETRYABLE_ERRORS = ['request failed or timed out']
const MAX_RETRIES = 2

export function retryIfDisconnected<T>(
  fn: () => Promise<T>,
  logger: Logger,
  additionalRetryableErrors: string[] = [],
): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, [...RETRYABLE_ERRORS, ...additionalRetryableErrors])) {
          logger.log(
            `Retryable error during ethereum-payments call, retrying ${MAX_RETRIES - attempt} more times`,
            e.toString(),
          )
          retry(e)
        }
        throw e
      })
    },
    {
      retries: MAX_RETRIES,
    },
  )
}

export function resolveServer(
  { server, requestTimeoutMs, api }: EthereumBlockbookConnectedConfig,
  logger: Logger,
): {
  api: BlockbookEthereum | null
  server: string[] | null
} {
  if (api) {
    return {
      api: api,
      server: api.nodes,
    }
  }

  if (isString(server)) {
    return {
      api: new BlockbookEthereum({
        nodes: [server],
        logger,
        requestTimeoutMs: requestTimeoutMs,
      }),
      server: [server],
    }
  }

  if (server instanceof BlockbookEthereum) {
    return {
      api: server,
      server: server.nodes,
    }
  }

  if (Array.isArray(server)) {
    return {
      api: new BlockbookEthereum({
        nodes: server,
        logger,
        requestTimeoutMs: requestTimeoutMs,
      }),
      server,
    }
  }

  // null server arg -> offline mode
  return {
    api: null,
    server: null,
  }
}

export function getBlockBookTxFromAndToAddress(tx: NormalizedTxEthereum) {
  if (tx.vin.length !== 1 || tx.vout.length !== 1) {
    throw new Error('transaction has less or more than one input or output')
  }

  const inputAddresses = tx.vin[0].addresses
  const outputAddresses = tx.vout[0].addresses

  if (!inputAddresses) {
    throw new Error(`txId = ${tx.txid} is missing input address`)
  }

  const fromAddress = inputAddresses[0]

  let toAddress: string
  let contractAddress: string | undefined
  if (outputAddresses) {
    toAddress = outputAddresses[0]
  } else {
    // for contract deploys, the outputAddress is null
    toAddress = deriveCreate1Address(fromAddress, tx.ethereumSpecific.nonce)
    contractAddress = toAddress
  }

  return {
    toAddress,
    fromAddress,
    contractAddress,
  }
}

export function assertWellFormedHex(x: string): string {
  if (!WELL_FORMED_HEX_REGEX.test(x)) {
    throw new Error(`Invalid or poorly formed hex value: ${x}`)
  }
  return x
}

/** Hashes the hex string using keccak256 and returns the hash as a hex string */
export function sha3(valueHex: string | Buffer): string {
  if (isString(valueHex)) {
    assertWellFormedHex(valueHex)
  }
  return buffToHex(keccak256(valueHex))
}

/**
 * Deterministically computes the address any smart contract will receive when deployed using create2.
 * Requires the address of the smart contract that performs the create2 method call, a hashed salt,
 * and the contract data being deployed.
 */
export function deriveCreate2Address(creatorAddress: string, salt: string, contractData: string): string {
  const address = strip0x(assertWellFormedHex(creatorAddress))
  const proxy = strip0x(sha3(contractData))
  salt = strip0x(assertWellFormedHex(salt))
  while (salt.length < 64) {
    salt = `0${salt}`
  }

  return prepend0x(sha3(`0xff${address}${salt}${proxy}`).slice(-40))
}

/**
 * Deterministically computes the address a proxy deposit contract will receive when deployed using create2.
 * Requires the address of the smart contract that performs the create2 method call and a salt.
 */
export function deriveProxyCreate2Address(creatorAddress: string, salt: string): string {
  const contractData = TOKEN_PROXY_DATA.replace(/<address to proxy>/g, strip0x(creatorAddress))
  return deriveCreate2Address(creatorAddress, salt, contractData)
}

/**
 * Deterministically computes the address any smart contract will receive when deployed using create1.
 * Requires the address of the sender and nonce of the deployment transaction.
 */
export function deriveCreate1Address(senderAddress: string, nonce: number): string {
  if (!ETHEREUM_ADDRESS_REGEX.test(senderAddress)) {
    throw new Error(`Invalid ethereum senderAddress provided to deriveCreate1Address: ${senderAddress}`)
  }
  if (nonce < 0 || nonce >= Number.MAX_SAFE_INTEGER) {
    throw new Error(`Invalid nonce provided to deriveCreate1Address: ${nonce}`)
  }
  return prepend0x(sha3(rlp.encode([senderAddress.toLowerCase(), nonce])).slice(-40))
}

