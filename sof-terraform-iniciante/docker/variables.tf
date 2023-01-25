variable "docker_image" {
  type        = string
  description = "Docker image to use for the container"
  validation {
    condition     = length(var.docker_image) > 0
    error_message = "docker_image must be specified"
  }
  nullable  = false
}