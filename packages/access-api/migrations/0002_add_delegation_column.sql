-- Migration number: 0002 	 2022-11-29T14:41:37.991Z
ALTER TABLE "spaces"
ADD COLUMN "delegation" text DEFAULT NULL;