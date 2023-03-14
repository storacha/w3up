import * as Ucanto from '@ucanto/interface'

export type ServiceInvoke<Service extends Record<string, any>> = <
  Capability extends Ucanto.Capability
>(
  invocation: Ucanto.ServiceInvocation<Capability, Service>
) => Promise<Ucanto.InferServiceInvocationReturn<Capability, Service>>
