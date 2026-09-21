# Persistence target

This repository owns the shared MongoDB instance for the Prime Host Stays project. Do **not** introduce per-service Mongo containers in the other repositories (`primehoststays-www`, `primehoststays.com-api`, `primehoststays-admin-www`, `primehoststays-admin-api`) — all services connect to this single instance with their own least-privilege users.

# Network

Services reach Mongo as `mongo` on the `phs-rest-dev` bridge network (DNS by service name). Do not hardcode container IPs, and do not publish the database port to anything other than loopback.
