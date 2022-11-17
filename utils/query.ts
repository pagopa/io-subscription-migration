import { OrganizationFiscalCode } from "@pagopa/ts-commons/lib/strings";
import knexBase from "knex";
import { IDecodableConfigPostgreSQL } from "./config";

// set Postgres as default db target for the query builder
const knex = knexBase({
  client: "pg"
});

/**
 * Query chunk filering migration table by a single organization
 * Common filters are applied, too
 *
 * @param dbConfig
 * @param organizationFiscalCode
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const MigrationsByOrganization = (
  dbConfig: IDecodableConfigPostgreSQL,
  organizationFiscalCode: OrganizationFiscalCode
) =>
  knex
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .from(`${dbConfig.DB_TABLE}`)
    .where({ organizationFiscalCode })
    // ignore subs that has never been visible, probably tests or drafts that aren't worth being migrated
    .and.where({ hasBeenVisibleOnce: true })
    // some subs have "deleted" in their name, we can skip them
    .and.not.whereILike("serviceName", "%deleted%");

/**
 * Query chunk filering migration table by a single organization
 * Common filters are apllied, too
 *
 * @param dbConfig
 * @param organizationFiscalCode
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const MigrationsByDelegate = (
  dbConfig: IDecodableConfigPostgreSQL,
  delegateId: string
) =>
  knex
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .from(`${dbConfig.DB_TABLE}`)
    .where({ sourceId: delegateId })
    // ignore subs that has never been visible, probably tests or drafts that aren't worth being migrated
    .and.where({ hasBeenVisibleOnce: true })
    // some subs have "deleted" in their name, we can skip them
    .and.not.whereILike("serviceName", "%deleted%");
