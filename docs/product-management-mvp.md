# Product Management MVP UI

Phase-1 exposes Product Management request history and `/requests/new` while
`VITE_PRODUCT_MANAGEMENT_MVP=true`. The system value is fixed; Country and Topic
select a dynamic mock form. The Portal Web calls Portal API contracts under
`/product-management/*`; their current implementation returns synthetic `MOCK`
data only.

The intended future boundary is Portal Web → Portal API → Product Management
Adapter → USR_PowerApp / existing workflow. No adapter, production read/write,
workflow invocation, provisioning, audit write or persistence is implemented by
this MVP. Existing Portal access request code remains present and is selected only
when `VITE_ACCESS_MANAGEMENT_UI=true`; API authorization and existing detail,
audit, and idempotency behavior are unchanged.
