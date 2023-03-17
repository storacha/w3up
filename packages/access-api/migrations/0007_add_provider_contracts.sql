-- Migration number: 0007 	 2023-03-10T14:14:00.000Z

-- goal: add tables to keep track of the subscriptions accounts have with
-- providers and a table to keep track of consumers of the subscriptions.

-- Table is used to keep track of the accounts subscribed to a provider(s).
-- Insertion here are caused by `customer/add` capability invocation.
-- Records here are idempotent meaning that invoking `customer/add` for the
-- same (order, provider, customer) triple will have no effect.
CREATE TABLE
    IF NOT EXISTS subscriptions (
      -- CID of the `customer/*` delegation from provider to the customer.
      provision TEXT NOT NULL,
      -- CID of the Task that created this subscription, usually this would be
      -- `customer/add` invocation.
      cause TEXT NOT NULL,
      -- Unique identifier for this subscription
      order TEXT NOT NULL,
      -- DID of the provider e.g. a storage provider
      provider TEXT NOT NULL,
      -- DID of the customer
      customer TEXT NOT NULL,
      -- metadata
      inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),

      -- Operation is idempotent, so we'll have a CID of the task that created
      -- this subscription. All subsequent invocations will be NOOPs.
      CONSTRAINT task_cid UNIQUE (cause),
      -- Subscription ID is derived from (order, provider) and is unique.
      -- Note that `customer` is not part of the primary key because we want to
      -- allow provider to choose how to enforce uniqueness constraint using
      -- the `order` field.
      PRIMARY KEY (order, provider)
    )

-- Table is used to keep track of the consumers of a subscription. Insertion
-- is caused by `customer/add` capability invocation typically by the account
-- that has been delegated `customer/*` capability when subscription was
-- created.
-- Note that while this table has a superset of the columns of `subscription`
-- table wi still need both because consumers may be added and removed without
-- canceling the subscription.
CREATE TABLE
  IF NOT EXISTS consumers (
    -- CID of the invocation that created this subscription
    cause TEXT NOT NULL,

    -- Below fields are used only to derive subscription ID.
    -- Unique identifier for this subscription
    order TEXT NOT NULL,
    -- DID of the provider e.g. a storage provider
    provider TEXT NOT NULL,
    
    -- subscription ID is derived from (order, provider). This is a virtual
    -- column which is not stored in the database but could be used in queries.
    subscription TEXT GENERATED ALWAYS AS (format("%s@%s", order, provider)) VIRTUAL,

    -- consumer DID
    consumer TEXT NOT NULL,
    -- metadata
    inserted_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),

    -- Operation that caused insertion of this record.
    CONSTRAINT task_cid UNIQUE (cause),
    -- We use (order, provider, consumer) as a composite primary key to enforce
    -- uniqueness constraint from the provider side. This allows provider to
    -- decide how to generate the order ID to enforce whatever constraint they
    -- want. E.g. web3.storage will enforce one provider per space by generating
    -- order by account DID, while nft.storage may choose to not have such
    -- limitation and generate a unique order based on other factors.
    PRIMARY KEY (order, provider, consumer)
  );
