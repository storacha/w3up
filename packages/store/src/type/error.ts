export interface ServiceError<
  Name extends string,
  JSON extends { name: Name; error: true; message: string }
> {
  readonly name: Name
  readonly message: string
  readonly error: true
  toJSON(): JSONObject<JSON>
}

export type ToJSON<T> = T extends undefined
  ? never
  : T extends number | null | string | boolean
  ? T
  : T extends { toJSON(): infer U }
  ? ToJSON<U>
  : T extends Array<infer U>
  ? Array<ToJSON<U>>
  : T extends (...args: any[]) => any
  ? never
  : T extends object
  ? { [K in keyof T]: ToJSON<T[K]> }
  : never

export type JSONObject<T extends object> = {
  [K in keyof T as ToJSON<T[K]> extends never ? never : K]: ToJSON<T[K]>
}
