import type { Link } from '@ucanto/interface'
import * as CBOR from '@ucanto/transport/cbor/codec'

export interface Product<Metadata extends Record<string, unknown> = {}> {
  /**
   * The product’s name, meant to be displayable to the customer.
   *
   * @param https://stripe.com/docs/api/products/object#product_object-name
   */
  name: string
  /**
   * The product’s description, meant to be displayable to the customer.
   *
   * @see https://stripe.com/docs/api/products/object#product_object-description
   */
  description: string
  /**
   * Set of key-value pairs that you can attach to an object. This can be useful
   * for storing additional information about the object in a structured format.
   *
   * @see https://stripe.com/docs/api/products/object#product_object-metadata
   */
  metadata: Metadata
}

export interface ProductLink<
  T extends Product = Product,
  Alg extends number = number
> extends Link<T, typeof CBOR.code, Alg> {}

export interface FreeTier extends Product {
  name: 'free-tier'
  description: 'Free tier w3 service subscription'
}

export interface EarlyAdopterTier extends Product {
  name: 'early-adopter'
  description: 'An early adopter w3 service subscription'
}
