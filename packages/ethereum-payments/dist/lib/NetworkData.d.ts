export declare class NetworkData {
    private gasStationUrl;
    private parityUrl;
    private infuraUrl;
    private eth;
    constructor(gasStationUrl?: string, parityUrl?: string, infuraUrl?: string);
    getNetworkData(action: string, from: string, to: string, speed: string): Promise<{
        pricePerGasUnit: string;
        nonce: string;
        amountOfGas: string;
    }>;
    getNonce(address: string): Promise<string>;
    getGasPrice(speed: string): Promise<string>;
    private estimateGas;
    private getWeb3Nonce;
    private getParityNonce;
    private getGasStationGasPrice;
    private getWeb3GasPrice;
}
