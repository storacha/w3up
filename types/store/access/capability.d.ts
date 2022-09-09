export const Validate: import("@ucanto/interface").TheCapabilityParser<import("@ucanto/interface").CapabilityMatch<"identity/validate", import("@ucanto/interface").URI<"did:">, {
    as: import("@ucanto/interface").Decoder<unknown, `mailto:${string}`, import("@ucanto/interface").Failure>;
}>>;
export const Register: import("@ucanto/interface").TheCapabilityParser<import("@ucanto/interface").CapabilityMatch<"identity/register", import("@ucanto/interface").URI<"mailto:">, {
    as: import("@ucanto/interface").Decoder<unknown, `did:${string}`, import("@ucanto/interface").Failure>;
}>>;
export const Link: import("@ucanto/interface").TheCapabilityParser<import("@ucanto/interface").CapabilityMatch<"identity/link", import("@ucanto/interface").URI<"did:">, {
    as: import("@ucanto/interface").Decoder<unknown, `did:${string}`, import("@ucanto/interface").Failure>;
}>>;
/**
 * `identity/identify` can be derived from any of the `store/*`
 * capability that has matching `with`. This allows store service
 * to identify account based on any user request.
 */
export const Identify: import("@ucanto/interface").TheCapabilityParser<import("@ucanto/interface").DerivedMatch<import("@ucanto/interface").ParsedCapability<"identity/identify", import("@ucanto/interface").URI<"did:">, import("@ucanto/interface").InferCaveats<{}>>, import("@ucanto/interface").CapabilityMatch<"store/add", import("@ucanto/interface").URI<"did:">, {
    link: import("@ucanto/interface").Decoder<unknown, import("@ucanto/interface").Link<unknown, number, number, 0 | 1> | undefined, import("@ucanto/interface").Failure>;
}> | import("@ucanto/interface").CapabilityMatch<"store/remove", import("@ucanto/interface").URI<"did:">, {
    link: import("@ucanto/interface").Decoder<unknown, import("@ucanto/interface").Link<unknown, number, number, 0 | 1> | undefined, import("@ucanto/interface").Failure>;
}> | import("@ucanto/interface").CapabilityMatch<"store/list", import("@ucanto/interface").URI<"did:">, {}> | import("@ucanto/interface").CapabilityMatch<"store/linkroot", import("@ucanto/interface").URI<"did:">, {
    rootLink: import("@ucanto/interface").Decoder<unknown, import("@ucanto/interface").Link<unknown, number, number, 0 | 1> | undefined, import("@ucanto/interface").Failure>;
    links: import("@ucanto/interface").Decoder<unknown, import("../store/decoder/Links.js").Link[] | undefined, import("@ucanto/interface").Failure>;
}>>>;
/**
 * Represents `identity/*` capability.
 */
export const Capability: import("@ucanto/interface").CapabilityParser<import("@ucanto/interface").DerivedMatch<import("@ucanto/interface").ParsedCapability<"identity/identify", import("@ucanto/interface").URI<"did:">, import("@ucanto/interface").InferCaveats<{}>>, import("@ucanto/interface").CapabilityMatch<"store/add", import("@ucanto/interface").URI<"did:">, {
    link: import("@ucanto/interface").Decoder<unknown, import("@ucanto/interface").Link<unknown, number, number, 0 | 1> | undefined, import("@ucanto/interface").Failure>;
}> | import("@ucanto/interface").CapabilityMatch<"store/remove", import("@ucanto/interface").URI<"did:">, {
    link: import("@ucanto/interface").Decoder<unknown, import("@ucanto/interface").Link<unknown, number, number, 0 | 1> | undefined, import("@ucanto/interface").Failure>;
}> | import("@ucanto/interface").CapabilityMatch<"store/list", import("@ucanto/interface").URI<"did:">, {}> | import("@ucanto/interface").CapabilityMatch<"store/linkroot", import("@ucanto/interface").URI<"did:">, {
    rootLink: import("@ucanto/interface").Decoder<unknown, import("@ucanto/interface").Link<unknown, number, number, 0 | 1> | undefined, import("@ucanto/interface").Failure>;
    links: import("@ucanto/interface").Decoder<unknown, import("../store/decoder/Links.js").Link[] | undefined, import("@ucanto/interface").Failure>;
}>> | import("@ucanto/interface").CapabilityMatch<"identity/register", import("@ucanto/interface").URI<"mailto:">, {
    as: import("@ucanto/interface").Decoder<unknown, `did:${string}`, import("@ucanto/interface").Failure>;
}> | import("@ucanto/interface").CapabilityMatch<"identity/link", import("@ucanto/interface").URI<"did:">, {
    as: import("@ucanto/interface").Decoder<unknown, `did:${string}`, import("@ucanto/interface").Failure>;
}>>;
//# sourceMappingURL=capability.d.ts.map