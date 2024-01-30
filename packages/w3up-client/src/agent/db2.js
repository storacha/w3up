import * as API from '@ucanto/interface'

/**
 * @typedef {number} Integer
 * @typedef {number} Float
 * @typedef {Readonly<Uint8Array>} Bytes
 * @typedef {string} UTF8
 *
 * @typedef {string|Float|Integer} Entity
 * @typedef {Integer|Float|Bytes|UTF8} Attribute
 * @typedef {boolean|UTF8|Integer|Float|Bytes} Data
 */

/**
 * Database is represented as a collection of facts.
 * @typedef {object} Database
 * @property {readonly Fact[]} facts
 */

/**
 * An atomic fact in the database, associating an `entity` , `attribute` ,
 * `value`.
 *
 * - `entity` - The first component is `entity` that specifies who or what the fact is about.
 * - `attribute` - Something that can be said about an `entity` . An attribute has a name,
 *    e.g. "firstName" and a value type, e.g. string, and a cardinality.
 * - `value` - Something that does not change e.g. 42, "John", true. Fact relates
 *    an `entity` to a particular `value` through an `attribute`.ich
 *
 * @typedef {readonly [entity: Entity, attribute: Attribute, value: Data]} Fact
 */

/**
 * Creates an assertion.
 *
 * @template {Entity} E
 * @template {Attribute} A
 * @template {Data} V
 *
 * @param {E} entity
 * @param {A} attribute
 * @param {V} value
 * @returns {readonly [entity: E, attribute:A, value:V]}
 */
export const assert = (entity, attribute, value) => [entity, attribute, value]

/**
 * Variable is placeholder for a value that will be matched against by the
 * query engine. It is represented as an abstract `Reader` that will attempt
 * to read arbitrary {@type Data} and return result with either `ok` of the
 * `Type` or an `error`.
 *
 * Variables will be assigned unique `bindingKey` by a query engine that will
 * be used as unique identifier for the variable.
 *
 * @template {Data} [Type=Data]
 * @typedef {API.Reader<Type, Data> & {propertyKey?: PropertyKey}} Variable
 */

/**
 * Term is either a constant or a {@link Variable}. Terms are used to describe
 * predicates of the query.
 *
 * @typedef {Data|Variable} Term
 */

/**
 * Describes association between `entity`, `attribute`, `value` of the
 * {@link Fact}. Each component of the {@link Relation} is a {@link Term}
 * that is either a constant or a {@link Variable}.
 *
 * Query engine during execution will attempt to match {@link Relation} against
 * all facts in the database and unify {@link Variable}s across them to identify
 * all possible solutions.
 *
 * @typedef {[entity: Term, attribute: Term, value: Term]} Relation
 */

/**
 * @typedef {{where: Relation[]}} Predicate
 */

/**
 * Selection describes set of (named) variables that query engine will attempt
 * to find values for that satisfy the query.
 *
 * @typedef {Record<PropertyKey, Variable>} Selector
 */

/**
 * @template {Selector} Selection
 * @typedef {{[Key in keyof Selection]: Selection[Key] extends Variable<infer T> ? T : never}} InferMatch
 */

/**
 * @template {Selector} Selection
 * @typedef {{[Key in keyof Selection]: Selection[Key] extends Variable<infer T> ? (Variable<T> | T) : never}} InferState
 */

const ENTITY = 0
const ATTRIBUTE = 1
const VALUE = 2

/**
 * @template {Selector} Selection

 * @param {Relation} relation
 * @param {Fact} fact
 * @param {InferState<Selection>} context
 * @returns {InferState<Selection>|null}
 */
export const matchRelation = (relation, fact, context) => {
  let state = context
  for (const id of [ENTITY, ATTRIBUTE, VALUE]) {
    const match = matchTerm(relation[id], fact[id], state)
    if (match) {
      state = match
    } else {
      return null
    }
  }

  return state
}

/**
 * @template {Selector} Selection
 *
 * @param {Term} term
 * @param {Data} data
 * @param {InferState<Selection>} context
 */
export const matchTerm = (term, data, context) =>
  // If term is a variable then we attempt to match a data against it
  // otherwise we compare data against the constant term.
  isVariable(term)
    ? matchVariable(term, data, context)
    : isBlank(term)
    ? context
    : matchConstant(term, data, context)

/**
 * @template Context
 *
 * @param {Data} constant
 * @param {Data} data
 * @param {Context} context
 * @returns {Context|null}
 */
export const matchConstant = (constant, data, context) =>
  constant === data ? context : null

/**
 * @typedef {Record<string|symbol, Data>} Context
 */

/**
 * @template {Selector} Selection
 *
 * @param {Variable} variable
 * @param {Data} data
 * @param {InferState<Selection>} context
 * @returns {InferState<Selection>|null}
 */
export const matchVariable = (variable, data, context) => {
  // Get key this variable is bound to in the context
  const key = SelectedVariable.getPropertyKey(variable)
  // If context already contains binding for we attempt o unify it with the
  // new data otherwise we bind the data to the variable.
  return key in context
    ? matchTerm(context[key], data, context)
    : { ...context, [key]: data }
}

/**
 * @template {Data} T
 * @param {unknown|Variable<T>} x
 * @returns {x is Variable<T>}
 */
const isVariable = (x) => {
  return (
    typeof x === 'object' &&
    x !== null &&
    'read' in x &&
    typeof x.read === 'function'
  )
}

/**
 *
 * @param {unknown} x
 * @returns {x is Schema._}
 */
const isBlank = (x) => x === Schema._

/**
 * @template {Selector} Selection
 * @param {Relation} relation
 * @param {Database} db
 * @param {InferState<Selection>} context
 * @returns {InferState<Selection>[]}
 */
const queryRelation = (relation, { facts }, context) => {
  const matches = []
  for (const triple of facts) {
    const match = matchRelation(relation, triple, context)
    if (match) {
      matches.push(match)
    }
  }

  return matches
}

/**
 * @template {Selector} Selection
 * @param {Database} db
 * @param {Relation[]} relations
 * @param {InferState<Selection>} context
 * @returns {InferState<Selection>[]}
 */
export const queryRelations = (db, relations, context) =>
  relations.reduce(
    /**
     * @param {InferState<Selection>[]} contexts
     * @param {Relation} relation
     * @returns
     */
    (contexts, relation) =>
      contexts.flatMap((context) => queryRelation(relation, db, context)),
    [context]
  )

/**
 * Takes a selector which is set of variables that will be used in the query
 * conditions. Returns a query builder that has `.where` method for specifying
 * the query conditions.
 *
 * @example
 * ```ts
 * const moviesAndTheirDirectorsThatShotArnold = select({
 *    directorName: Schema.string(),
 *    movieTitle: Schema.string(),
 * }).where(({ directorName, movieTitle }) => {
 *    const arnoldId = Schema.number()
 *    const movie = Schema.number()
 *    const director = Schema.number()
 *
 *    return [
 *      [arnold, "person/name", "Arnold Schwarzenegger"],
 *      [movie, "movie/cast", arnoldId],
 *      [movie, "movie/title", movieTitle],
 *      [movie, "movie/director", director],
 *      [director, "person/name", directorName]
 *   ]
 * })
 * ```
 *
 * @template {Selector} Selection
 * @param {Selection} selector
 * @returns {QueryBuilder<Selection>}
 */
export const select = (selector) => new QueryBuilder({ select: selector })

/**
 * @template {Selector} Selection
 * @param {Database} db
 * @param {object} source
 * @param {Selection} source.select
 * @param {Iterable<Relation|Predicate>} source.where
 * @returns {InferMatch<Selection>[]}
 */
export const query = (db, { select, where }) => {
  /** @type {Relation[]} */
  const relations = []
  for (const relation of where) {
    if (Array.isArray(relation)) {
      relations.push(relation)
    } else {
      relations.push(...relation.where)
    }
  }

  const contexts = queryRelations(
    db,
    relations,
    /** @type {InferState<Selection>} */ ({})
  )
  return contexts.map((context) => materialize(select, context))
}
/**
 * A query builder API which is designed to enable type inference of the query
 * and the results it will produce.
 *
 * @template {Selector} Select
 */
class QueryBuilder {
  /**
   * @param {object} source
   * @param {Select} source.select
   */
  constructor({ select }) {
    this.select = select
  }
  /**
   * @param {(variables: Select) => Iterable<Relation|Predicate>} conditions
   * @returns {Query<Select>}
   */
  where(conditions) {
    return new Query({
      select: this.select,
      where: [...conditions(this.select)],
    })
  }
}

/**
 * @template {Record<string, unknown>} Object
 * @param {Object} object
 * @returns {{[Key in keyof Object]: [Key, Object[Key]]}[keyof Object][]}
 */
const entries = (object) => /** @type {any} */ (Object.entries(object))

/**
 * @template {Selector} Selection
 */
class Query {
  /**
   * @param {object} model
   * @param {Selection} model.select
   * @param {(Relation|Predicate)[]} model.where
   */
  constructor(model) {
    this.model = model
  }

  /**
   *
   * @param {Database} db
   * @returns {InferMatch<Selection>[]}
   */
  execute(db) {
    return query(db, this.model)
  }
}

/**
 * @template {Selector} Selection
 * @param {Selection} select
 * @param {InferState<Selection>} context
 * @returns {InferMatch<Selection>}
 */
const materialize = (select, context) =>
  /** @type {InferMatch<Selection>} */
  (
    Object.fromEntries(
      entries(select).map(([name, variable]) => [
        name,
        isVariable(variable)
          ? context[SelectedVariable.getPropertyKey(variable)]
          : variable,
      ])
    )
  )

const IS = Symbol.for('is')

/**
 * @template {Data} T
 * @implements {API.Reader<T, Data>}
 */
export class Schema {
  /**
   * @param {(value: unknown) => value is T} is
   */
  constructor(is) {
    this[IS] = is
  }
  /**
   * @param {unknown} value
   * @returns {{ok: T, error?: undefined}|{ok?: undefined, error: Error}}
   */
  read(value) {
    return this[IS](value)
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

  static _ = Object.assign(
    new Schema(
      /**
       * @param {unknown} _
       * @returns {_ is any}
       */
      (_) => true
    ),
    { propertyKey: '_' }
  )
}

/**
 * @template {Data} [T=Data]
 * @template {PropertyKey} [Key=PropertyKey]
 * @extends {Variable<T>}
 */
class SelectedVariable {
  static lastKey = 0

  /**
   * @param {Variable} variable
   * @returns {PropertyKey}
   */
  static getPropertyKey(variable) {
    const { propertyKey } = variable
    if (propertyKey) {
      return propertyKey
    } else {
      const bindingKey = `${++this.lastKey}`
      variable.propertyKey = bindingKey
      return bindingKey
    }
  }

  /**
   * @param {object} source
   * @param {Key} source.key
   * @param {Variable<T>} source.schema
   */
  constructor({ key, schema }) {
    this.propertyKey = key
    this.schema = schema
  }

  /**
   * @param {Data} value
   */
  read(value) {
    return this.schema.read(value)
  }
}

/**
 * @template {Record<PropertyKey, Variable>} Attributes
 * @param {Attributes} attributes
 * @returns {EntityView<Attributes> & Attributes}
 */
export const entity = (attributes) =>
  Object.assign(new EntityView(attributes), attributes)

/**
 * @template {Record<PropertyKey, Variable>} Attributes
 * @extends {Schema<Entity>}
 */
class EntityView extends Schema {
  /**
   *
   * @param {unknown} value
   * @returns {value is Entity}
   */
  static isEntity(value) {
    switch (typeof value) {
      case 'string':
      case 'number':
        return true
      default:
        return false
    }
  }
  /**
   * @param {Attributes} attributes
   */
  constructor(attributes) {
    super(EntityView.isEntity)
    Object.assign(this, attributes)
  }
  /**
   * @param {Partial<{[Key in keyof Attributes]: Term}>} pattern
   * @returns {{where: Relation[]}}
   */
  match(pattern = {}) {
    const where = []
    const attributes = /** @type {Attributes} */ (this.valueOf())

    for (const [key, variable] of entries(attributes)) {
      const term = pattern[key] ?? variable
      // If there is a reference to an entity we include into relation, this
      // ensures that values for all entity attributes are aggregated.
      if (term instanceof EntityView) {
        where.push(...term.match().where)
      }

      where.push(/** @type {Relation} */ ([this, key, term]))
    }

    return { where }
  }

  /**
   * @param {Partial<{[Key in keyof Attributes]: Data}>} model
   * @returns {Iterable<Fact>}
   */
  *assert(model) {
    const attributes = /** @type {Attributes} */ (this.valueOf())
    for (const key of Object.keys(attributes)) {
      const value = model[key]
      if (value) {
        yield assert(0, key, value)
      }
    }
  }
}
