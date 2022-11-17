import { Client } from "pg";
import * as env from "./env";

const client = new Client({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME
});

beforeAll(async () => {
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

const aRandomSubscriptionId = () => `a-sub-id-${Date.now()}`;

// Dummy insert for a given subscriptionId
const aMigrationInsertSQL = (subscriptionId: string) => `
    INSERT INTO "${env.DB_SCHEMA}".migrations(
        "subscriptionId", "organizationFiscalCode", "serviceVersion", "serviceName", "sourceId", "sourceName", "sourceSurname", "sourceEmail", "isVisible", "hasBeenVisibleOnce")
        VALUES ('${subscriptionId}', '0000000000', 1, 'any name', 'source-id', 'source-name', 'source-surname', 'source@email.com', true, true)
`;

// Dummy insert for a given subscriptionId, with conflict clause to make an upsert
const aMigrationInsertOnConflictSQL = (subscriptionId: string) => `
    ${aMigrationInsertSQL(subscriptionId)}
        ON CONFLICT("subscriptionId")
        DO UPDATE SET "sourceName" = 'updated on conflict' -- dummy update
`;

// Dummy update for a given subscriptionId
const aMigrationUpdateSQL = (subscriptionId: string) => `
    UPDATE "${env.DB_SCHEMA}".migrations
        SET "subscriptionId"='${subscriptionId}' -- dummy update
        WHERE  "subscriptionId"='${subscriptionId}'
`;

// Select one record by subscriptionId
const aMigrationSelectSQL = (subscriptionId: string) => `
   SELECT * FROM "${env.DB_SCHEMA}".migrations WHERE "subscriptionId" = '${subscriptionId}'
`;

describe("Set last update time", () => {
  it("should update 'update_at' field on every record update", async () => {
    /*
      Given an existing record, fetch its "updateAt" value.
      Then perform an update and fetch "updateAt" again.
      Compare dates so that the latter is bigger, proving the value has been updated automatically
    */

    const subscriptionId = aRandomSubscriptionId();

    await client.query(aMigrationInsertSQL(subscriptionId));

    const {
      rows: [{ updateAt: date_before_update }]
    } = await client.query(aMigrationSelectSQL(subscriptionId));

    await client.query(aMigrationUpdateSQL(subscriptionId));

    const {
      rows: [{ updateAt: date_after_update }]
    } = await client.query(aMigrationSelectSQL(subscriptionId));

    expect(new Date(date_before_update).getTime()).toBeLessThan(
      new Date(date_after_update).getTime()
    );
  });

  it("should update 'update_at' field on insert with conflict", async () => {
    const subscriptionId = aRandomSubscriptionId();

    /*
      Given an existing record, fetch its "updateAt" value.
      Then perform an insert with conflict clause  and fetch "updateAt" again.
      Compare dates so that the latter is bigger, proving the value has been updated automatically
    */

    await client.query(aMigrationInsertOnConflictSQL(subscriptionId));

    const {
      rows: [{ updateAt: date_before_update }]
    } = await client.query(aMigrationSelectSQL(subscriptionId));

    await client.query(aMigrationInsertOnConflictSQL(subscriptionId));

    const {
      rows: [{ updateAt: date_after_update }]
    } = await client.query(aMigrationSelectSQL(subscriptionId));

    expect(new Date(date_before_update).getTime()).toBeLessThan(
      new Date(date_after_update).getTime()
    );
  });
});
