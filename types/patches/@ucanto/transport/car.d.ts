export { CAR as codec };
export function encode<I extends API.Transport.Tuple<API.IssuedInvocation<API.UCAN.Capability<API.UCAN.Ability, `${string}:${string}`>>>>(invocations: I, options?: API.EncodeOptions | undefined): Promise<API.HTTPRequest<I>>;
export function decode<Invocations extends API.Transport.Tuple<API.IssuedInvocation<API.UCAN.Capability<API.UCAN.Ability, `${string}:${string}`>>>>({ headers, body }: API.HTTPRequest<Invocations>): Promise<API.InferInvocations<Invocations>>;
import * as CAR from "./car/codec.js";
import * as API from "@ucanto/interface";
//# sourceMappingURL=car.d.ts.map