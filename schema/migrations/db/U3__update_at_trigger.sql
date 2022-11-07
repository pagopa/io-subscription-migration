DROP TRIGGER IF EXISTS update_migrations_updateAt_with_current_timestamp ON "${schemaName}".migrations CASCADE;

DROP FUNCTION IF EXISTS "${schemaName}".set_current_timestamp_on_updateAt();
