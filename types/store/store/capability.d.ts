export const Add: API.TheCapabilityParser<API.CapabilityMatch<"store/add", API.URI<"did:">, {
    link: API.Decoder<unknown, API.UCAN.Link<unknown, number, number, 0 | 1> | undefined, API.Failure>;
}>>;
export const Remove: API.TheCapabilityParser<API.CapabilityMatch<"store/remove", API.URI<"did:">, {
    link: API.Decoder<unknown, API.UCAN.Link<unknown, number, number, 0 | 1> | undefined, API.Failure>;
}>>;
export const List: API.TheCapabilityParser<API.CapabilityMatch<"store/list", API.URI<"did:">, {}>>;
export const LinkRoot: API.TheCapabilityParser<API.CapabilityMatch<"store/linkroot", API.URI<"did:">, {
    rootLink: API.Decoder<unknown, API.UCAN.Link<unknown, number, number, 0 | 1> | undefined, API.Failure>;
    links: API.Decoder<unknown, Links.Link[] | undefined, API.Failure>;
}>>;
export const Capability: API.CapabilityParser<API.CapabilityMatch<"store/add", API.URI<"did:">, {
    link: API.Decoder<unknown, API.UCAN.Link<unknown, number, number, 0 | 1> | undefined, API.Failure>;
}> | API.CapabilityMatch<"store/remove", API.URI<"did:">, {
    link: API.Decoder<unknown, API.UCAN.Link<unknown, number, number, 0 | 1> | undefined, API.Failure>;
}> | API.CapabilityMatch<"store/list", API.URI<"did:">, {}> | API.CapabilityMatch<"store/linkroot", API.URI<"did:">, {
    rootLink: API.Decoder<unknown, API.UCAN.Link<unknown, number, number, 0 | 1> | undefined, API.Failure>;
    links: API.Decoder<unknown, Links.Link[] | undefined, API.Failure>;
}>>;
import * as API from "@ucanto/interface";
import * as Links from "./decoder/Links.js";
//# sourceMappingURL=capability.d.ts.map