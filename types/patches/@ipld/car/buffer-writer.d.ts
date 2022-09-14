export function addRoot(writer: CarBufferWriter, root: CID, { resize }?: {
    resize?: boolean;
}): void;
export function blockLength({ cid, bytes }: Block): number;
export function addBlock(writer: CarBufferWriter, { cid, bytes }: Block): void;
export function close(writer: CarBufferWriter, { resize }?: {
    resize?: boolean | undefined;
} | undefined): Uint8Array;
export function resizeHeader(writer: CarBufferWriter, byteLength: number): void;
export function calculateHeaderLength(rootLengths: number[]): number;
export function headerLength({ roots }: {
    roots: CID[];
}): number;
export function estimateHeaderLength(rootCount: number, rootByteLength?: number | undefined): number;
export function createWriter(buffer: ArrayBuffer, { roots, byteOffset, byteLength, headerSize, }?: {
    roots?: import("multiformats/cid").CID[] | undefined;
    byteOffset?: number | undefined;
    byteLength?: number | undefined;
    headerSize?: number | undefined;
} | undefined): CarBufferWriter;
export type CID = import('@ipld/car/api').CID;
export type Block = import('@ipld/car/api').Block;
export type Writer = import('@ipld/car/api').CarBufferWriter;
export type Options = import('@ipld/car/api').CarBufferWriterOptions;
/**
 * @typedef {import('@ipld/car/api').CID} CID
 * @typedef {import('@ipld/car/api').Block} Block
 * @typedef {import('@ipld/car/api').CarBufferWriter} Writer
 * @typedef {import('@ipld/car/api').CarBufferWriterOptions} Options
 */
/**
 * A simple CAR writer that writes to a pre-allocated buffer.
 *
 * @class
 * @name CarBufferWriter
 * @implements {Writer}
 */
declare class CarBufferWriter implements Writer {
    /**
     * @param {Uint8Array} bytes
     * @param {number} headerSize
     */
    constructor(bytes: Uint8Array, headerSize: number);
    /** @readonly */
    readonly bytes: Uint8Array;
    byteOffset: number;
    /**
     * @readonly
     * @type {CID[]}
     */
    readonly roots: CID[];
    headerSize: number;
    /**
     * Add a root to this writer, to be used to create a header when the CAR is
     * finalized with {@link CarBufferWriter.close `close()`}
     *
     * @param {CID} root
     * @param {{resize?:boolean}} [options]
     * @returns {CarBufferWriter}
     */
    addRoot(root: CID, options?: {
        resize?: boolean | undefined;
    } | undefined): CarBufferWriter;
    /**
     * Write a `Block` (a `{ cid:CID, bytes:Uint8Array }` pair) to the archive.
     * Throws if there is not enough capacity.
     *
     * @param {Block} block A `{ cid:CID, bytes:Uint8Array }` pair.
     * @returns {CarBufferWriter}
     */
    write(block: Block): CarBufferWriter;
    /**
     * Finalize the CAR and return it as a `Uint8Array`.
     *
     * @param {object} [options]
     * @param {boolean} [options.resize]
     * @returns {Uint8Array}
     */
    close(options?: {
        resize?: boolean | undefined;
    } | undefined): Uint8Array;
}
export {};
