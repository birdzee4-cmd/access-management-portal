# Local development seed data

`development.seed.json` contains synthetic reference data for local development and design review only.

Safety rules:

- Every person, employee ID, Entra object ID, and email address is fictional.
- Email addresses use the reserved `.invalid` top-level domain.
- The fixture contains no production identifiers or copied legacy data.
- Task 03 intentionally provides no executable seed loader, so the fixture cannot write to a database.
- A future seed loader must refuse every non-local database target before opening a connection.

The fixture uses stable codes to describe relationships. A future local-only loader can resolve those codes to generated UUID primary keys.
