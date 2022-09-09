export * from "./capability.js";
export function connect({ id, url, transport, fetch, method, }: {
    id: API.DID;
    url: URL;
    method?: string | undefined;
    fetch?: any;
    transport?: API.OutpboundTranpsortOptions | undefined;
}): API.ConnectionView<{
    identity: API.Identity.Identity;
}>;
import * as API from "@ucanto/interface";
//# sourceMappingURL=client.d.ts.map