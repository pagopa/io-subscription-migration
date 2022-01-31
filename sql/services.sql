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
    "serviceVersion" integer NOT NULL,
    "serviceName" character varying  NOT NULL,
    "updateAt" timestamp default current_timestamp,
);


INSERT INTO "ServicesMigration"."Services"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName", "sourceSurname", "sourceEmail", "serviceVersion", "serviceName")
	VALUES (1, 2, 3, 'Lorenzo', 'Franceschini', 'postaforum@gmail.com', 0, 'Test Service');


INSERT INTO "ServicesMigration"."Services"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName",
	"sourceSurname", "sourceEmail", "serviceVersion", "serviceName")
	VALUES (1, 33, 3, 'Lorenzo', 'Franceschini', 'postaforum@gmail.com', 1, 'Test Service')
	ON CONFLICT ("subscriptionId")

	DO UPDATE
		SET "organizationFiscalCode" = "excluded"."organizationFiscalCode",
		"serviceVersion" = "excluded"."serviceVersion",
		"serviceName" = "excluded"."serviceName"
		WHERE "ServicesMigration"."Services"."status" <> 'PENDING'
        AND "ServicesMigration"."Services"."serviceVersion" < "excluded"."serviceVersion"

