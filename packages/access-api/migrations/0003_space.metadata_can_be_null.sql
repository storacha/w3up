-- Migration number: 0003 	 2022-12-12T18:58:30.339Z
ALTER TABLE spaces
RENAME TO _spaces_old;

CREATE TABLE
    spaces (
        did TEXT NOT NULL PRIMARY KEY,
        product TEXT NOT NULL,
        email TEXT NOT NULL,
        agent TEXT NOT NULL,
        inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        metadata JSON DEFAULT EMPTY,
        invocation TEXT NOT NULL DEFAULT EMPTY,
        delegation TEXT DEFAULT NULL,
        UNIQUE (did)
    );

INSERT INTO
    spaces (
        did,
        product,
        email,
        agent,
        inserted_at,
        updated_at,
        metadata,
        invocation,
        delegation
    )
SELECT
    did,
    product,
    email,
    agent,
    inserted_at,
    updated_at,
    metadata,
    invocation,
    delegation
FROM
    _spaces_old;

DROP TABLE "_spaces_old";