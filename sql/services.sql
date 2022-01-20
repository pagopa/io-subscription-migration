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
    "updateAt" timestamp default current_timestamp,
);



INSERT INTO "ServicesMigration"."Services"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName", "sourceSurname", "sourceEmail")
	VALUES (1, 2, 3, 'Lorenzo', 'Franceschini', 'postaforum@gmail.com');


INSERT INTO "ServicesMigration"."Services"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName",
	"sourceSurname", "sourceEmail")
	VALUES (1, 20, 3, 'Lorenzo', 'Franceschini', 'postaforum@gmail.com')
	ON CONFLICT ("subscriptionId")
	DO UPDATE
		SET organizationFiscalCode = "EXCLUDED"."organizationFiscalCode";

