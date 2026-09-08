# Product Management MVP UI

Phase-1 exposes Product Management request history and `/requests/new` while
`VITE_PRODUCT_MANAGEMENT_MVP=true`. The system value is fixed; Country and Topic
select a dynamic mock form. The Portal Web calls Portal API contracts under
`/product-management/*`; their current implementation returns synthetic `MOCK`
data only.

## PM-02 read-only master-data boundary

The implemented boundary is Portal Web → Portal API →
`ProductManagementMasterDataService` → `ProductManagementMasterDataAdapter`.
The Web consumes only authenticated Portal API routes:

- `GET /api/product-management/countries`
- `GET /api/product-management/countries/{country}/topics`
- `GET /api/product-management/forms/{country}/{topic}`
- `GET /api/product-management/lookups/{lookup}` with bounded dependency query
  values (`country`, `topic`, `providerType`, `package`, `appName`)

`PRODUCT_MANAGEMENT_DATA_SOURCE=mock|real` controls the adapter. Local development
may default to mock; tracked examples select `mock` explicitly. Missing/invalid
mode outside development fails closed. `real` also fails clearly with HTTP 503
because the repository does not contain a confirmed real master-data mapping;
there is no silent fallback to mock.

## Source mapping evidence

| Portal field | Existing source evidence | Entity / fields | Dependency | Status |
| --- | --- | --- | --- | --- |
| Country | No authoritative master-data export found | `All_SharepointUserRequest.Country` is request history, not master data | Root | UNKNOWN; mock |
| Topic | No authoritative master-data export found | `All_SharepointUserRequest.TopicRequest` is request history, not master data | Country | UNKNOWN; mock |
| Provider Type | No source identified | — | Country + Topic | UNKNOWN; mock |
| Package | No source identified | — | Provider Type | UNKNOWN; mock |
| Package Add On | No source identified | — | Package | UNKNOWN; mock |
| App Name | No source identified | — | Package | UNKNOWN; mock |
| Product | No source identified | — | Country + Topic | UNKNOWN; mock |
| Account | No source identified | — | App Name | UNKNOWN; mock |
| Role | Product Management approval matrices are documented | `MatrixProductManagement_*`.`RoleName` is an approval/role-mapping label, not an authoritative master | App Name | UNKNOWN; mock |

The four `MatrixProductManagement_*` tables expose only `RoleName`, `Manager`,
`Department`, and `Active`. Repository documentation explicitly prohibits treating
them as a complete or authoritative master-data catalog, so PM-02 does not map
them to these form fields. A real adapter requires confirmed source ownership,
entities, columns, keys, filters and a separately authorized read configuration.

Mock mode supplies synthetic dependency-filtered values for local/test use. No
production read was performed to create this mapping.

## Preserved safety boundary

The future target remains Portal API → Product Management Adapter → existing
system. No production write, request persistence, USR_PowerApp call, Power
Automate change, workflow invocation, provisioning, audit write or production
adapter is implemented. Existing Portal access request code remains present and
is selected only when `VITE_ACCESS_MANAGEMENT_UI=true`; API authorization and
existing detail, audit, and idempotency behavior are unchanged.
