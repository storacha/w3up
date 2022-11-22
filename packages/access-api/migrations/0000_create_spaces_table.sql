-- Migration number: 0000 	 2022-11-17T15:52:48.968Z
CREATE TABLE
    IF NOT EXISTS spaces (
        did TEXT NOT NULL PRIMARY KEY,
        product TEXT NOT NULL,
        email TEXT NOT NULL,
        agent TEXT NOT NULL,
        inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (did)
    );