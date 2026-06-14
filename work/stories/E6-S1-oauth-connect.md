---
id: E6-S1
epic: E6
title: Interactive OAuth connect (sandbox)
status: done
constrained_by: [db09d3a5-bc04-4d0b-b174-908272d9ec2e, 3f1b6b21-be8e-40fc-b125-839bae8989cf, 8258b4de-3303-4b29-b2b0-7110c05edcaf]
depends_on: [E1-S3]
---

OAuth 1.0a dance with user-present authorization against the sandbox; consumer key/secret from env; tokens encrypted at rest in Postgres; read-only scope of use.

## Done (code-complete; live handshake pending real credentials)
`lib/etrade/{oauth,crypto,config,client}.ts` + `etrade_connections` table + connect/verifier UI (`components/etrade-connect.tsx`). OAuth 1.0a HMAC-SHA1 (golden test), AES-256-GCM token encryption (round-trip test). Verified: "not configured" state renders the bridge guidance. **External: live sandbox handshake needs E*TRADE developer credentials (R2 long pole).**
