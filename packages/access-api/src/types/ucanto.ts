import * as Ucanto from '@ucanto/interface'

export type ServiceInvoke<
  Service extends Record<string, any>,
  InvocationCapabilities extends Ucanto.Capability = Ucanto.Capability
> = <Capability extends InvocationCapabilities>(
  invocation: Ucanto.ServiceInvocation<Capability>
) => Promise<Ucanto.InferServiceInvocationReturn<Capability, Service>>
