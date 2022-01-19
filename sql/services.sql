CREATE SCHEMA "ServicesMigration";

CREATE TABLE IF NOT EXISTS "ServicesMigration"."Services"
(
    "subscriptionId" character(26) NOT NULL PRIMARY KEY,
    "organizationFiscalCode" character(11) NOT NULL,
    "sourceId" character(26) NOT NULL,
    "sourceName" character varying NOT NULL,
    "sourceSurname" character varying NOT NULL,
    "sourceEmail" character varying NOT NULL,
    status character varying DEFAULT 'INITIAL',
    note text,
    "updateAt" date,
);



INSERT INTO "ServicesMigration"."Services"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName", "sourceSurname", "sourceEmail", "updateAt")
	VALUES (1, 2, 3, 'Lorenzo', 'Franceschini', 'postaforum@gmail.com', '2022-01-17');

