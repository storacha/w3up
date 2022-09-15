/**
 * @param {ClientOptions} options
 * @returns Client
 */
export function createClient(options: ClientOptions): Client;
export function importToken(input: UCAN.JWT): Promise<API.Delegation | Failure>;
export default Client;
/**
 * A string representing a link to another object in IPLD
 */
export type Link = API.Link;
export type Result = API.Result<unknown, ({
    error: true;
} | API.HandlerExecutionError | API.Failure)>;
export type strResult = API.Result<string, ({
    error: true;
} | API.HandlerExecutionError | API.Failure)>;
export type ClientOptions = {
    /**
     * - The DID of the service to talk to.
     */
    serviceDID: API.DID;
    /**
     * - The URL of the service to talk to.
     */
    serviceURL: string;
    /**
     * - The URL of the access service.
     */
    accessURL: string;
    /**
     * - The DID of the access service.
     */
    accessDID: API.DID;
    /**
     * - A map/db of settings to use for the client.
     */
    settings: Map<string, any>;
};
declare class Client {
    /**
     * Create an instance of the w3 client.
     * @param {ClientOptions} options
     */
    constructor({ serviceDID, serviceURL, accessURL, accessDID, settings, }?: ClientOptions);
    serviceURL: URL;
    serviceDID: UCAN.DID<unknown>;
    accessURL: URL;
    accessDID: UCAN.DID<unknown>;
    settings: Map<string, any>;
    storeClient: API.ConnectionView<{
        store: API.Store;
        identity: UCAN.Identity;
    }>;
    accessClient: API.ConnectionView<any>;
    /**
     * Get the current "machine" DID
     * @async
     * @returns {Promise<API.SigningAuthority>}
     */
    identity(): Promise<API.SigningAuthority>;
    /**
     * Register a user by email.
     * @param {string|undefined} email - The email address to register with.
     */
    register(email: string | undefined): Promise<string>;
    /**
     * @async
     * @throws {Error}
     * @returns {Promise<UCAN.JWT>}
     */
    checkRegistration(): Promise<UCAN.JWT>;
    /**
     * @async
     * @returns {Promise<Result>}
     */
    whoami(): Promise<Result>;
    /**
     * List all of the uploads connected to this user.
     * @async
     * @returns {Promise<Result>}
     */
    list(): Promise<Result>;
    /**
     * Upload a car via bytes.
     * @async
     * @param {Uint8Array} bytes - the url to upload
     * @returns {Promise<strResult>}
     */
    upload(bytes: Uint8Array): Promise<strResult>;
    /**
     * Remove an uploaded file by CID
     * @param {API.Link} link - the CID to remove
     */
    remove(link: API.Link): Promise<API.Result<unknown, {
        error: true;
    } | API.HandlerNotFound | API.HandlerExecutionError | API.InvalidAudience | API.Unauthorized>>;
    /**
     * Remove an uploaded file by CID
     * @param {Link} root - the CID to link as root.
     * @param {Array<Link>} links - the CIDs to link as 'children'
     */
    /**
     * @async
     * @param {Link} link - the CID to get insights for
     * @returns {Promise<object>}
     */
    insights(link: Link): Promise<object>;
}
import { UCAN } from "@ucanto/core";
import * as API from "@ucanto/interface";
import { Delegation } from "@ucanto/core";
import { Failure } from "@ucanto/validator";
import { SigningAuthority } from "@ucanto/authority";
