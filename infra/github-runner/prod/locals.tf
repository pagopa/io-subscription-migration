locals {
  prefix    = "io"
  env_short = "p"

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    ManagementTeam = "IO Enti & Servizi"
    Source         = "https://github.com/pagopa/io-subscription-migration/blob/master/infra/github-runner/prod"
  }
}
