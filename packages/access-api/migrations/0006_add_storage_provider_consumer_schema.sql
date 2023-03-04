-- Migration number: 0006 	 2023-03-02T16:40:04.407Z

/*
goal: add a table to keep track of the storage provider for a space.
to enable https://github.com/web3-storage/w3protocol/issues/459
*/

CREATE TABLE
    -- provision: the action of providing or supplying something for use
    -- use case: representing the registration of a storage provider to a space
    IF NOT EXISTS provisions (
        -- cid of invocation that created this provision
        cid TEXT NOT NULL PRIMARY KEY,
        -- DID of the actor that is consuming the provider. e.g. a space DID
        consumer TEXT NOT NULL,
        -- DID of the provider e.g. a storage provider
        provider TEXT NOT NULL,
        -- DID of the actor that authorized this provision
        sponsor TEXT NOT NULL,
        inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
