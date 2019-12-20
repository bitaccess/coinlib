export declare function keysOf<T extends {
    [k: string]: any;
} | {
    [k: number]: any;
}>(o: T): (keyof T)[];
