locals {
  prefix    = "io"
  env_short = "p"
  env       = "prod"
  location  = "italynorth"
  project   = "${local.prefix}-${local.env_short}"
  domain    = "subsmigrations"

  repo_name = "io-subscription-migration"

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    ManagementTeam = "IO Enti & Servizi"
    Source         = "https://github.com/pagopa/io-subscription-migration/blob/master/infra/identity/prod"
  }
}
