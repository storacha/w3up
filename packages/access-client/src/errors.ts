/**
 * Indicates failure executing ability that requires access to a space that is not well-known enough to be handled.
 * e.g. it's a space that's never been seen before,
 * or it's a seen space that hasn't been fully registered such that the service can serve info about the space.
 */
export interface SpaceUnknown {
  error: true
  message: string
  name: 'SpaceUnknown'
}
