import { todo } from 'node:test'
import db from '../../test/fixtures/movie-facts.js'

/**
 * @typedef {string|number|boolean} Value
 * @typedef {[Var<Value, string>|Value, Var<Value, string>|Value, Var<Value, string>|Value]} Pattern

 * @typedef {readonly [Value, Value, Value]} Datom
 * @typedef {readonly Datom[]} Database
 * @typedef {Record<string, Value>} Attributes
 *
 */

const ENTITY = 0
const ATTRIBUTE = 1
const VALUE = 2

/**
 * @template {Selector} Selection

 * @param {Pattern} pattern
 * @param {Datom} source
 * @param {InferState<Selection>} context
 * @returns {InferState<Selection>|null}
 */
export const matchPattern = (pattern, source, context) => {
  const entity = matchPart(pattern[ENTITY], source[ENTITY], context)
  const attribute = entity
    ? matchPart(pattern[ATTRIBUTE], source[ATTRIBUTE], entity)
    : entity
  const value = attribute
    ? matchPart(pattern[VALUE], source[VALUE], attribute)
    : attribute

  return /** @type {InferState<Selection>|null} */ (value)
}

/**
 * @template {Selector} Selection
 *
 * @param {Var|Value} input
 * @param {Value} source
 * @param {InferState<Selection>} context
 */
const matchPart = (input, source, context) =>
  isVariable(input)
    ? matchVariable(input, source, context)
    : matchValue(input, source, context)

/**
 * @template {{}} Context
 * @param {Value} expect
 * @param {Value} actual
 * @param {Context} context
 * @returns {Context|null}
 */
const matchValue = (expect, actual, context) =>
  expect === actual ? context : null

/**
 * @typedef {Record<string|symbol, Value>} Context
 */

/**
 * @template {Selector} Selection
 *
 * @param {Var} variable
 * @param {Value} source
 * @param {InferState<Selection>} context
 * @returns {InferState<Selection>|null}
 */
const matchVariable = (variable, source, context) => {
  if (variable.name in context) {
    const bound = context[variable.name]
    return matchPart(bound, source, context)
  }

  return { ...context, [variable.name]: source }
}

/**
 * @template {Value} T
 * @template {string} Name
 * @param {unknown|Var<T, Name>} x
 * @returns {x is Var<T, Name>}
 */
const isVariable = (x) => {
  return x instanceof Var
}

/**
 * @template {Selector} Selection
 * @param {Pattern} pattern
 * @param {Database} db
 * @param {InferState<Selection>} context
 */
const querySingle = (pattern, db, context) => {
  const matches = []
  for (const triple of db) {
    const match = matchPattern(pattern, triple, context)
    if (match) {
      matches.push(match)
    }
  }
  return matches
}

/**
 * @template {Selector} Selection
 * @param {Database} db
 * @param {object} query
 * @param {InferVariables<Selection>} query.find
 * @param {Pattern[]} query.where
 */
export function queryWhere(db, { where }) {
  return where.reduce(
    /**
     *
     * @param {InferState<Selection>[]} contexts
     * @param {Pattern} pattern
     * @returns
     */
    (contexts, pattern) =>
      contexts.flatMap((context) => querySingle(pattern, db, context)),
    [/** @type {InferState<Selection>} */ ({})]
  )
}

// /**
//  * @template {Bindings} Selector
//  *
//  * @param {Database} db
//  * @param {object} selector
//  * @param {Selector} selector.find
//  * @param {Pattern[]} selector.where
//  * @returns
//  */
// export const query = (db, { find, where }) => {
//   const contexts = queryWhere(db, where)
//   return contexts.map((context) => actualize(find, context))
// }

/**
 * @typedef {Record<string, Reader<Value>|Value>} Selector
 */
/**
 * @template {Selector} Selection
 * @typedef {{[Key in keyof Selection]: Selection[Key] extends Reader<infer T> ? Var<T, Key & string> : Selection[Key]}} InferVariables
 */
/**
 * @template {Selector} Selection
 * @typedef {{[Key in keyof Selection]: Selection[Key] extends Reader<infer T> ? T : Selection[Key]}} InferMatch
 */
/**
 * @template {Selector} Selection
 * @typedef {{[Key in keyof Selection]: Selection[Key] extends Reader<infer T> ? (Var<T, Key & string> | T) : Selection[Key] & Value}} InferState
 */

/**
 * Takes a selector which is set of variables that will be used in the query
 * conditions. Returns a query builder that has `.where` method for specifying
 * the query conditions.
 *
 * ```example
 * const moviesAndTheirDirectorsThatShotArnold = select({
 *    directorName: Schema.string(),
 *    movieTitle: Schema.string(),
 *    arnold: Schema.number(),
 *    movie: Schema.number(),
 *    director: Schema.number()
 * }).where(({ directorName, movieTitle, arnold }) => [
 *    [arnold, "person/name", "Arnold Schwarzenegger"],
 *    [movie, "movie/cast", arnoldId],
 *    [movie, "movie/title", movieTitle],
 *    [movie, "movie/director", director],
 *    [director, "person/name", directorName]
 * ])
 * ```
 *
 * @template {Selector} Selection
 * @param {Selection} selector
 */
export const select = (selector) => new Select({ selector })

/**
 * A query builder API which is designed to enable type inference of the query
 * and the results it will produce.
 *
 * @template {Selector} Selection
 */
class Select {
  /**
   * @param {object} source
   * @param {Selection} source.selector
   */
  constructor({ selector }) {
    /** @type {InferVariables<Selection>} */
    this.bindings = Object.fromEntries(
      Object.entries(selector).map(([name, schema]) =>
        schema instanceof Schema
          ? [name, new Var({ name, schema })]
          : [name, schema]
      )
    )
  }
  /**
   * @param {(variables: InferVariables<Selection>) => Iterable<Pattern>} where
   * @returns {Query<Selection>}
   */
  where(where) {
    return new Query({
      find: this.bindings,
      where: where(this.bindings),
    })
  }
}

/**
 * @template {Selector} Selection
 */
class Query {
  /**
   * @param {object} source
   * @param {InferVariables<Selection>} source.find
   * @param {Iterable<Pattern>} source.where
   */
  constructor({ find, where }) {
    this.find = find
    this.where = [...where]
  }

  /**
   *
   * @param {Database} db
   * @returns {InferMatch<Selection>[]}
   */
  from(db) {
    const contexts = queryWhere(db, this)
    return contexts.map((context) => actualize(this.find, context))
  }
}

/**
 * @template {Selector} Selection
 * @param {InferVariables<Selection>} selector
 * @param {InferState<Selection>} context
 * @returns {InferMatch<Selection>}
 */
const actualize = (selector, context) =>
  /** @type {InferMatch<Selection>} */
  (
    Object.fromEntries(
      Object.entries(selector).map(([name, binding]) => [
        name,
        isVariable(binding) ? context[name] : binding,
      ])
    )
  )

const moviedId = Symbol('movieId')
const another = Symbol('test')

/**
 * @template {Value} T
 */
class Reader {
  /**
   * @param {unknown} value
   * @returns {{ok: T, error?: undefined}|{ok?: undefined, error: Error}}
   */
  read(value) {
    return { error: new Error('Value does not match') }
  }
}

/**
 * @template {Value} T
 * @extends {Reader<T>}
 */
class Schema extends Reader {
  /**
   * @param {(value: unknown) => value is T} is
   */
  constructor(is) {
    super()
    this.is = is
  }
  /**
   * @param {unknown} value
   * @returns {{ok: T, error?: undefined}|{ok?: undefined, error: Error}}
   */
  read(value) {
    return this.is(value)
      ? { ok: value }
      : { error: new TypeError(`Unknown value type ${typeof value}`) }
  }

  static string() {
    return new Schema(
      /**
       * @param {unknown} value
       * @returns {value is string}
       */
      (value) => typeof value === 'string'
    )
  }
  static number() {
    return new Schema(
      /**
       * @param {unknown} value
       * @returns {value is number}
       */
      (value) => typeof value === 'number'
    )
  }
  static boolean() {
    return new Schema(
      /**
       * @param {unknown} value
       * @returns {value is boolean}
       */
      (value) => typeof value === 'boolean'
    )
  }

  /**
   * @template {string} Name
   * @param {Name} name
   */
  variable(name) {
    return new Var({ name, schema: this })
  }
}

/**
 * @template {Value} [T=Value]
 * @template {string} [Name=string]
 * @extends {Reader<T>}
 */
class Var extends Reader {
  /**
   * @param {object} source
   * @param {Name} source.name
   * @param {Schema<T>} source.schema
   */
  constructor({ name, schema }) {
    super()
    this.name = name
    this.schema = schema
  }

  /**
   * @param {unknown} value
   * @returns {{ok: T, error?: undefined}|{ok?: undefined, error: Error}}
   */
  read(value) {
    return this.schema.read(value)
  }
}

const output = select({
  uploadLink: Schema.string(),
  storeLink: Schema.string(),
  space: Schema.string(),
  uploadID: Schema.string(),
  storeID: Schema.string(),
})
  .where(({ uploadLink, storeLink, space, uploadID, storeID }) => [
    [uploadLink, 'capabilities', uploadID],
    [uploadID, 'can', 'upload/add'],
    [uploadID, 'with', space],
    [storeLink, 'capabilities', storeID],
    [storeID, 'can', 'store/add'],
    [storeID, 'with', space],
  ])
  .from([
    ['bafy...upload', 'issuer', 'did:key:zAlice'],
    ['bafy...upload', 'audience', 'did:key:zBob'],
    ['bafy...upload', 'expiration', 1702413523],
    ['bafy...upload', 'capabilities', 'bafy...upload/capabilities/0'],
    ['bafy...upload/capabilities/0', 'can', 'upload/add'],
    ['bafy...upload/capabilities/0', 'with', 'did:key:zAlice'],

    ['bafy...store', 'issuer', 'did:key:zAlice'],
    ['bafy...store', 'audience', 'did:key:zBob'],
    ['bafy...store', 'expiration', 1702413523],
    ['bafy...store', 'capabilities', 'bafy...store/capabilities/0'],
    ['bafy...store/capabilities/0', 'can', 'store/add'],
    ['bafy...store/capabilities/0', 'with', 'did:key:zAlice'],

    ['bafy...store', 'capabilities', 'bafy...store/capabilities/1'],
    ['bafy...store/capabilities/1', 'can', 'store/list'],
    ['bafy...store/capabilities/1', 'with', 'did:key:zAlice'],
  ])

const result = { ...output[0] }

// const legacy = () => {
//   transact([
//     tx.todos[workoutId].update({ title: 'Go on a run' }),
//     tx.todos[proteinId].update({ title: 'Drink protein' }),
//     tx.todos[sleepId].update({ title: 'Go to bed early' }),
//     tx.todos[standupId].update({ title: 'Do standup' }),
//     tx.todos[reviewPRsId].update({ title: 'Review PRs' }),
//     tx.todos[focusId].update({ title: 'Code a bunch' }),
//     tx.goals[healthId]
//       .update({ title: 'Get fit!' })
//       .link({ todos: workoutId })
//       .link({ todos: proteinId })
//       .link({ todos: sleepId }),
//     tx.goals[workId]
//       .update({ title: 'Get promoted!' })
//       .link({ todos: standupId })
//       .link({ todos: reviewPRsId })
//       .link({ todos: focusId }),
// ])

class DB {
  /**
   * @template {string} EntityType
   * @param {EntityType} type
   */
  static collection(type) {
    return new Collection(type)
  }

  constructor() {
    return new DB()
  }

  /**
   * @param {(Assertion<string, Attributes>|Retraction<string, Attributes>)[]} assertions
   */
  transact(assertions) {}
}

/**
 * @template {string} EntityType
 */
class Collection {
  /**
   * @param {EntityType} type
   */
  constructor(type) {
    this.type = type
  }
  /**
   * @template {Attributes} Model
   * @param {Model} model
   */
  create(model) {
    return new Entity(this.type, model)
  }

  /**
   * @template {Attributes} Assertion
   * @param {Assertion} model
   */
  assert(model) {
    return new Assertion(this.type, model)
  }
  /**
   * @template {Attributes} Assertion
   * @param {Assertion} model
   */
  retract(model) {
    return new Retraction(this.type, model)
  }
}

/**
 * @template {string} EntityType
 * @template {Attributes} Assertion
 */
class Assertion {
  /**
   *
   * @param {EntityType} type
   * @param {Assertion} attributes
   */
  constructor(type, attributes) {
    this.type = type
    this.attributes = attributes
  }
}

/**
 * @template {string} EntityType
 * @template {Attributes} Assertion
 */
class Retraction {
  /**
   *
   * @param {EntityType} type
   * @param {Assertion} attributes
   */
  constructor(type, attributes) {
    this.type = type
    this.attributes = attributes
  }
}

/**
 * @template {string} EntityType
 * @template {Record<string, Value>} Model
 */
class Entity {
  /**
   *
   * @param {EntityType} type
   * @param {Model} model
   */
  constructor(type, model) {
    this.type = type
    this.model = model
  }
  /**
   * @template {Record<string, Entity<any, any>>} Extension
   * @param {Extension} extension
   * @returns {Entity<EntityType, Model & Extension>}
   */
  link(extension) {
    return new Entity(this.type, { ...this.model, ...extension })
  }
}

const Todo = DB.collection('todo')
const Goal = DB.collection('goal')

const demo = () => {
  const workout = Todo.create({ title: 'Go on a run' })
  const protein = Todo.create({ title: 'Drink protein' })
  const sleep = Todo.create({ title: 'Go to bed early' })

  const health = Goal.create({ title: 'Get fit!' })

  workout.link({ todo: workout }).link({ todo: protein }).link({ todo: sleep })
}
