import { Reporter } from 'io-ts/lib/Reporter';
import { Type } from 'io-ts';
export { PathReporter } from 'io-ts/lib/PathReporter';
export declare const SimpleReporter: Reporter<Array<string>>;
export declare function assertType<T>(typeCodec: Type<T>, value: unknown, description?: string): T;
