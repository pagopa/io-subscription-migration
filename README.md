# IO Subscription Migration

1. Servizi -> [SubscriptionId, OrganizationFiscalCode, {ServiceName}] [...]
  Loop:
  2. Valido unknown -> RetrievedService
  3. APIM subscription.get(SubscriptionId) -> Dati della Subscription -> OwnerId
  4. APIM user.get(ownerId) -> Dati del Delegato
  5. Costruisco struttura [SubscriptionId, OrganizationFiscalCode, Dati del Delegato]
  6. Check if [SubscriptionId]
  6a. Insert [SubscriptionId, OrganizationFiscalCode, {ServiceName}, DelegatoId, DatiDelegato ] => Tabella PostgreSQL
  6b. Update [OrganizationFiscalCode, {ServiceName}, timestamp] => Tabella PostgreSQL


V0, Vn => metadati del servizio