export const code: 514;
export function createWriter(): Writer;
export function encode({ roots, blocks }: Partial<Model>): Uint8Array;
export function decode(bytes: Uint8Array): Promise<Model>;
export function link(bytes: Uint8Array, { hasher }?: {
    hasher?: API.UCAN.MultihashHasher<number> | undefined;
} | undefined): Promise<API.UCAN.Link<Model, 514, number, 1> & import("multiformats").CID>;
export function write(data: Partial<Model>, { hasher }?: {
    hasher?: API.UCAN.MultihashHasher<number> | undefined;
} | undefined): Promise<{
    bytes: Uint8Array;
    cid: API.UCAN.Link<Model, 514, number, 1> & import("multiformats").CID;
}>;
export type Block = API.UCAN.Block<unknown, number, number, 0 | 1>;
export type Model = {
    roots: Block[];
    blocks: Map<string, Block>;
};
/**
 * @typedef {API.UCAN.Block<unknown, number, number, 0|1>} Block
 * @typedef {{
 * roots: Block[]
 * blocks: Map<string, Block>
 * }} Model
 */
declare class Writer {
    /**
     * @param {Block[]} blocks
     * @param {number} byteLength
     */
    constructor(blocks?: Block[], byteLength?: number);
    written: Set<any>;
    blocks: Block[];
    byteLength: number;
    /**
     * @param {Block[]} blocks
     */
    write(...blocks: Block[]): Writer;
    /**
     * @param {Block[]} rootBlocks
     */
    flush(...rootBlocks: Block[]): Uint8Array;
}
import * as API from "@ucanto/interface";
import { UCAN } from "@ucanto/core";
export {};
//# sourceMappingURL=codec.d.ts.map