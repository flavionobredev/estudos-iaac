# Básico: Nginx com Docker

**Anotações**:

- para carregar automáticamente as variaveis de arquivos `*.tfvars` é necessário especificar o nome do arquivo como `*.auto.tfvars`. Exemplo:
  - O arquivo de variáveis `variables.tfvars` não será carregado automaticamente.
  - Se mudarmos o nome do arquivo para `variables.auto.tfvars` ele será carregado automaticamente.
- Ao adicionar plugins (providers), por exemplo o do docker, é necessário executar o comando `terraform init` para que o terraform baixe as dependências.
- Cada provider possui seus própios recursos, por exemplo, o provider do docker possui o recurso `docker_container` que é responsável por criar um container. Esses recursos estão disponiveis no site [Registry Terraform](https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs).
- É possível definir um arquivo `.tf` apenas para guardar definições de variáveis. No repositório, temos o arquivo [`variavels.tf`](variables.tf) como exemplo.