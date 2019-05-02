export declare class Bip44Cache {
    store: {
        [xpub: string]: {
            addresses: {
                [index: number]: string;
            };
            indices: {
                [address: string]: number;
            };
        };
    };
    put(xpub: string, index: number, address: string): void;
    lookupIndex(xpub: string, address: string): number | undefined;
    lookupAddress(xpub: string, index: number): string | undefined;
}
export default Bip44Cache;
