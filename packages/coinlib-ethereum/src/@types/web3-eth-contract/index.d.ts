
declare module 'web3-eth-contract' {
  import BN = require('bn.js');
  import {Common, PromiEvent, provider, hardfork, chain, BlockNumber, PastLogsOptions, LogsOptions} from 'web3-core';
  import {AbiItem} from 'web3-utils';

  export interface Filter {
      [key: string]: number | string | string[] | number[];
  }

  export interface PastEventOptions extends PastLogsOptions {
      filter?: Filter;
  }

  export interface EventOptions extends LogsOptions {
      filter?: Filter;
  }

  export interface EventData {
      returnValues: {
          [key: string]: any;
      };
      raw: {
          data: string;
          topics: string[];
      };
      event: string;
      signature: string;
      logIndex: number;
      transactionIndex: number;
      transactionHash: string;
      blockHash: string;
      blockNumber: number;
      address: string;
  }

  export interface CallOptions {
      from?: string;
      gasPrice?: string;
      gas?: number;
  }

  export interface SendOptions {
      from: string;
      gasPrice?: string;
      gas?: number;
      value?: number | string | BN;
  }

  export interface EstimateGasOptions {
      from?: string;
      gas?: number;
      value?: number | string | BN;
  }

  export interface ContractOptions {
      // Sender to use for contract calls
      from?: string;
      // Gas price to use for contract calls
      gasPrice?: string;
      // Gas to use for contract calls
      gas?: number;
      // Contract code
      data?: string;
  }

  export interface Options extends ContractOptions {
      address: string;
      jsonInterface: AbiItem[];
  }

  export interface DeployOptions {
      data: string;
      arguments?: any[];
  }

  // TODO: Add generic type!
  export default class Contract {
      constructor(
          jsonInterface: AbiItem[],
          address?: string,
          options?: ContractOptions
      );

      private _address: string;
      private _jsonInterface: AbiItem[];
      defaultAccount: string | null;
      defaultBlock: BlockNumber;
      defaultCommon: Common;
      defaultHardfork: hardfork;
      defaultChain: chain;
      transactionPollingTimeout: number;
      transactionConfirmationBlocks: number;
      transactionBlockTimeout: number;
      handleRevert: boolean;

      options: Options;

      setProvider(provider: provider): true

      clone(): Contract;

      deploy(options: DeployOptions): {
        send(
            options: SendOptions,
            callback?: (err: Error, transactionHash: string) => void
        ): PromiEvent<Contract>;

        call(
            options?: CallOptions,
            callback?: (err: Error, result: any) => void
        ): Promise<any>;

        estimateGas(
            options?: EstimateGasOptions,
            callback?: (err: Error, gas: number) => void
        ): Promise<number>;

        estimateGas(callback: (err: Error, gas: number) => void): Promise<number>;

        encodeABI(): string;
      };

      methods: any;

      once(
          event: string,
          callback: (error: Error, event: EventData) => void
      ): void;

      once(
          event: string,
          options: EventOptions,
          callback: (error: Error, event: EventData) => void
      ): void;

      events: any;

      getPastEvents(
          event: string,
          options?: PastEventOptions,
          callback?: (error: Error, event: EventData) => void
      ): Promise<EventData[]>;

      getPastEvents(
          event: string,
          callback: (error: Error, event: EventData) => void
      ): Promise<EventData[]>;
  }
}
