import * as DB from '../../src/agent/db2.js'
import * as Test from '../test.js'
import * as movieDB from '../fixtures/movie-facts.js'

const proofsDB = /** @type {const} */ ({
  facts: [
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
  ],
})

/**
 * @type {Test.BasicSuite}
 */
export const testDB = {
  'test capabilities across ucans': async (assert) => {
    const uploadLink = DB.Schema.string()
    const storeLink = DB.Schema.string()

    const space = DB.Schema.string()
    const uploadID = DB.Schema.string()
    const storeID = DB.Schema.string()

    const result = DB.query(proofsDB, {
      select: {
        uploadLink,
        storeLink,
        space,
      },
      where: [
        [uploadLink, 'capabilities', uploadID],
        [uploadID, 'can', 'upload/add'],
        [uploadID, 'with', space],
        [storeLink, 'capabilities', storeID],
        [storeID, 'can', 'store/add'],
        [storeID, 'with', space],
      ],
    })

    assert.deepEqual(result, [
      {
        uploadLink: 'bafy...upload',
        storeLink: 'bafy...store',
        space: 'did:key:zAlice',
      },
    ])
  },
  'test query builder': async (assert) => {
    const query = DB.select({
      uploadLink: DB.Schema.string(),
      storeLink: DB.Schema.string(),
    }).where(({ uploadLink, storeLink }) => {
      const space = DB.Schema.string()
      const uploadID = DB.Schema.string()
      const storeID = DB.Schema.string()

      return [
        [uploadLink, 'capabilities', uploadID],
        [uploadID, 'can', 'upload/add'],
        [uploadID, 'with', space],
        [storeLink, 'capabilities', storeID],
        [storeID, 'can', 'store/add'],
        [storeID, 'with', space],
      ]
    })

    assert.deepEqual(query.execute(proofsDB), [
      {
        uploadLink: 'bafy...upload',
        storeLink: 'bafy...store',
      },
    ])
  },

  'test baisc': async (assert) => {
    const facts = [
      DB.assert('sally', 'age', 21),
      DB.assert('fred', 'age', 42),
      DB.assert('ethel', 'age', 42),
      DB.assert('fred', 'likes', 'pizza'),
      DB.assert('sally', 'likes', 'opera'),
      DB.assert('ethel', 'likes', 'sushi'),
    ]

    const e = DB.Schema.number()

    assert.deepEqual(
      DB.query(
        { facts },
        {
          select: { e },
          where: [[e, 'age', 42]],
        }
      ),
      [{ e: 'fred' }, { e: 'ethel' }]
    )

    const x = DB.Schema.number()
    assert.deepEqual(
      DB.query(
        { facts },
        {
          select: { x },
          where: [[DB.Schema._, 'likes', x]],
        }
      ),
      [{ x: 'pizza' }, { x: 'opera' }, { x: 'sushi' }]
    )
  },

  'sketch pull pattern': (assert) => {
    const director = DB.entity({
      'person/name': DB.Schema.string(),
    })

    const actor = DB.entity({
      'person/name': DB.Schema.string(),
    })

    const movie = DB.entity({
      'movie/title': DB.Schema.string(),
      'movie/director': director,
      'movie/cast': actor,
    })

    assert.deepEqual(
      DB.query(
        {
          facts: [...actor.assert({ 'person/name': 'Arnold Schwarzenegger' })],
        },
        {
          select: {
            director: director['person/name'],
            movie: movie['movie/title'],
          },
          where: [
            actor.match({ 'person/name': 'Arnold Schwarzenegger' }),
            movie.match({
              'movie/cast': actor,
              'movie/director': director,
            }),
          ],
        }
      ),
      [
        ,
        { director: 'James Cameron', movie: 'The Terminator' },
        { director: 'John McTiernan', movie: 'Predator' },
        { director: 'Mark L. Lester', movie: 'Commando' },
        { director: 'James Cameron', movie: 'Terminator 2: Judgment Day' },
        {
          director: 'Jonathan Mostow',
          movie: 'Terminator 3: Rise of the Machines',
        },
      ]
    )
  },
}

Test.basic({ DB: testDB })
