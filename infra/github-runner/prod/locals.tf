locals {
  prefix    = "io"
  env_short = "p"
  location  = "italynorth"

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "App IO"
    ManagementTeam = "IO Enti & Servizi"
    Source         = "https://github.com/pagopa/io-subscription-migration/blob/master/infra/github-runner/prod"
  }
}
