# Planned GigTask API endpoints

This is a preliminary interface plan for the later API implementation. No endpoint is implemented in the current scaffold. IDs are PostgreSQL UUIDs unless noted; list responses should include pagination metadata. Exact request and response schemas will be finalized when the API is built.

| Method and path | Main input | Planned output / behavior |
| --- | --- | --- |
| `GET /api/clients` | `page`, `page_size`, optional `search` | Paginated client list with total count |
| `GET /api/clients/{id}` | Client ID | Client profile and current escrow balance |
| `GET /api/freelancers` | `page`, `page_size`, optional `search` or skill | Paginated freelancer list |
| `GET /api/freelancers/{id}` | Freelancer ID | Freelancer detail and portfolio preview |
| `GET /api/contracts` | `page`, `page_size`, optional client, freelancer, or status | Paginated contract list |
| `GET /api/contracts/{id}` | Contract ID | Contract detail |
| `POST /api/gigs/fund` | Client ID, freelancer ID, positive budget | Call inherited `fund_gig`; return contract, before/after escrow, and audit entry, or a clear funding error |
| `PATCH /api/contracts/{id}/status` | Next status | Updated contract, or constraint/transition error |
| `GET /api/clients/{id}/audit` | Date range, `page`, `page_size` | Ordered audit records with a trustworthy running balance |
| `GET /api/analytics/revenue` | Freelancer ID and optional date range | Daily earnings, seven-day moving average, and `DENSE_RANK()` result |
| `GET /api/analytics/lifetime` | Optional freelancer ID | Materialized-view totals and last-refresh time |
| `POST /api/analytics/refresh` | None | Refresh materialized view and return completion time |
| `GET /api/workers/nearby` | Longitude, latitude | Available workers within 5 km, sorted by distance, using `$geoNear` |
| `GET /api/reviews/summary` | Optional freelancer ID | `$facet` rating distribution, top skill tags, and overall average |
| `GET /api/freelancers/{id}/portfolio` | Freelancer ID | Flexible MongoDB `Portfolios` document |

The [handover note](handover_note.md) lists database behavior that must be addressed before these contracts can be implemented accurately. Authentication is outside the current assignment plan; a demo actor selector is planned for the UI.
