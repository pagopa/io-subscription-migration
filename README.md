# IO Subscription Migration

## Testing
### Unit tests
Unit tests are configured in `jest.config.js` and executed by
```sh
yarn test
```

### SQL Schema tests
Test suites into `./schema/__tests__` executed by the `test:schema` script and are meant to refer to the SQL Schema only. They expect a PostgresSQL instance to be up&running.
Please note queries can modify the database status, so prefer using a disposable database instance.

```sh
# Share values between the database, migration scripts and test suites.
# Values are arbitrary and can be anything
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=mysecretpassword
export DB_SCHEMA=MySchema
export DB_NAME=db

# Run a disposable PostgresSQL instance
docker run --rm -d \
    -e POSTGRES_DB=$DB_NAME \
    -e POSTGRES_PASSWORD=$DB_PASSWORD \
    -p $DB_PORT:5432 \
    postgres

# Run sql migration scripts
./scripts/run_flyway_on_server.sh migrate $DB_NAME $DB_HOST $DB_PORT $DB_USER $DB_PASSWORD schema/migrations $DB_SCHEMA

# Execute tests
yarn test:schema
```
