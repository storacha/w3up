-- Migration number: 0005 	 2023-02-09T23:48:40.469Z

/*
goal: remove the foreign key constraint on delegations.audience -> accounts.did.
We want to be able to store delegations whose audience is not an account did.

sqlite doesn't support `alter table drop constraint`.
So here we will:
* create delegations_new table without the constraint
* insert all from delegations -> delegations_new
* rename delegations_new -> delegations
*/

ALTER TABLE delegations RENAME TO delegations_deleted_1677807019;

CREATE TABLE
    IF NOT EXISTS delegations (
        cid TEXT NOT NULL PRIMARY KEY,
        bytes BLOB NOT NULL,
        audience TEXT NOT NULL,
        issuer TEXT NOT NULL,
        expiration TEXT,
        inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (cid)
    );

INSERT INTO delegations (cid, bytes, audience, issuer, expiration, inserted_at, updated_at)
SELECT cid, bytes, audience, issuer, expiration, inserted_at, updated_at FROM delegations_deleted_1677807019;
