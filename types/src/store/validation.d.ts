export function equalWith<T extends API.ParsedCapability<API.UCAN.Ability, API.URI<`${string}:`>, any>, U extends API.ParsedCapability<API.UCAN.Ability, API.URI<`${string}:`>, any>>(claimed: T, delegated: U): true | Failure;
export function derivesURIPattern(claimed: string, delegated: string): true | Failure;
import * as API from "@ucanto/interface";
import { Failure } from "@ucanto/validator";
