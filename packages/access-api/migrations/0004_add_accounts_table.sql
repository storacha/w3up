-- Migration number: 0004 	 2023-01-24T15:09:12.316Z
CREATE TABLE
    IF NOT EXISTS accounts (
        did TEXT NOT NULL PRIMARY KEY,
        inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (did)
    );

CREATE TABLE
    IF NOT EXISTS delegations (
        cid TEXT NOT NULL PRIMARY KEY,
        bytes BLOB NOT NULL,
        audience TEXT NOT NULL,
        issuer TEXT NOT NULL,
        expiration TEXT,
        inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (cid),
        FOREIGN KEY (audience) REFERENCES accounts (did) ON UPDATE CASCADE ON DELETE CASCADE
    );