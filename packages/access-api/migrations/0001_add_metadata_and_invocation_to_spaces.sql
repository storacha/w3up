-- Migration number: 0001 	 2022-11-24T11:52:58.174Z
ALTER TABLE "spaces"
ADD COLUMN "metadata" JSON NOT NULL DEFAULT '"{}"';

ALTER TABLE "spaces"
ADD COLUMN "invocation" text NOT NULL DEFAULT EMPTY;
