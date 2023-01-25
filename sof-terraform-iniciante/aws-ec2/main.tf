terraform {
  required_version = "~> 1.3.7"
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 4.16"
      # configuration_aliases = [ aws.useast2 ]
    }
  }
}

provider "aws" {
  profile = "terraform"
  region = "sa-east-1"
}

resource "aws_instance" "SAYGGP1" {
  ami = "ami-0b0d54b52c62864d6"
  instance_type = "t2.micro"
  key_name = "bet_statistic"
  tags = {
    Name = "SAYGGP1"
  }
}

