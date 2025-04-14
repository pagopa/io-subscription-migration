module "container_app_job_selfhosted_runner" {
  source = "github.com/pagopa/dx//infra/modules/github_selfhosted_runner_on_container_app_jobs?ref=main"

  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    instance_number = "01"
  }

  container_app_environment = {
    id       = data.azurerm_container_app_environment.cae.id
    location = local.location
  }

  resource_group_name = "io-p-selfcare-be-rg"

  repository = {
    name = "io-subscription-migration"
  }

  key_vault = {
    name                = "${local.prefix}-${local.env_short}-kv-common"
    resource_group_name = "${local.prefix}-${local.env_short}-rg-common"
  }

  tags = local.tags
}

data "azurerm_container_app_environment" "cae" {
  name                = "${local.prefix}-${local.env_short}-itn-github-runner-cae-01"
  resource_group_name = "${local.prefix}-${local.env_short}-itn-github-runner-rg-01"
}
