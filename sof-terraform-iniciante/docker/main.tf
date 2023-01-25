terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.0.1"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

resource "docker_container" "nginx-test" {
  image = docker_image.nginx.name
  name  = "nginx-test"
  ports {
    internal = 80
    external = 8000
  }
}

resource "docker_image" "nginx" {
  name         = var.docker_image
  keep_locally = false
}
