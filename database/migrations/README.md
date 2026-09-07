# Migrations

Contains reviewed migrations for the dedicated Access Management Portal database only.

Do not create, apply, or baseline migrations against the existing production SQL Server.

`20260907120000_m1_portal_request_engine` is the initial full-schema baseline for
a new Portal-owned SQL Server database. It includes M1 request metadata,
idempotency, a current-role reference for REMOVE/CHANGE, foreign keys and
fail-closed request vocabulary/shape constraints. M1 generated and statically
validated this artifact but did not apply it because no approved local Portal
database target was available. Applying it requires an explicitly verified,
empty Portal-owned target and separate operator review.
