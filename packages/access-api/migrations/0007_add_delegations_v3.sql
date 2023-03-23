-- Migration number: 0007 	 2023-03-20T23:48:40.469Z

/*
goal: add a new table to store delegations in
which doesn't have a 'bytes' column.

context: we're going to start storing bytes outside of the database (e.g. in R2)
*/

CREATE TABLE
    IF NOT EXISTS delegations_v3 (
        /* cidv1 dag-ucan/dag-cbor sha2-256 */
        cid TEXT NOT NULL PRIMARY KEY,
        audience TEXT NOT NULL,
        issuer TEXT NOT NULL,
        expiration TEXT,
        inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (cid)
    );
