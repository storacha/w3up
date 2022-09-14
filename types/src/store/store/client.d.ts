export function connect({ id, url, transport, fetch, method, }: {
    id: API.DID;
    url: URL;
    method?: string | undefined;
    fetch?: any;
    transport?: Client.OutpboundTranpsortOptions | undefined;
}): API.ConnectionView<{
    store: API.Store;
    identity: API.Identity;
}>;
import * as API from "@ucanto/interface";
import * as Client from "@ucanto/client";
