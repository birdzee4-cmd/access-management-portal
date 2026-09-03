# Local development seed data

The development.seed.json file contains a complete synthetic fixture for local development and design review only. It covers catalog data, three fake users, an approval matrix, one pending access request, two clearly fake external references, and one audit event.

Safety rules:

- Every person, employee ID, Entra object ID, and email address is fictional.
- Email addresses use the reserved `.invalid` top-level domain.
- The fixture contains no production identifiers or copied legacy data.
- Task 04 intentionally provides no executable seed loader, so the fixture cannot write to a database.
- A future seed loader must refuse every non-local database target before opening a connection.

The fixture uses stable codes and request numbers to describe relationships. A future local-only loader can resolve those values to generated UUID primary keys and serialize object-valued metadata into the schema's NVARCHAR(MAX) JSON-text fields.

No seed command is configured. Loading this fixture later requires an approved local SQL Server instance and a loader that rejects remote, legacy, and production targets before opening a connection.
