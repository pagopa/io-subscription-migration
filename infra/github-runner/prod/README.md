# IO Subscription Migration - GitHub Self-Hosted runner

<!-- markdownlint-disable -->
<!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.26.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_container_app_job_selfhosted_runner"></a> [container\_app\_job\_selfhosted\_runner](#module\_container\_app\_job\_selfhosted\_runner) | github.com/pagopa/dx//infra/modules/github_selfhosted_runner_on_container_app_jobs | main |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_environment.cae](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/container_app_environment) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_container_app_job"></a> [container\_app\_job](#output\_container\_app\_job) | n/a |
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
