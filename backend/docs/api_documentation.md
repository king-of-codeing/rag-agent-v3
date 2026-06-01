\# Acme Platform API — Developer Documentation



\## Overview

The Acme Platform API provides programmatic access to user accounts, billing, and resource provisioning.

Base URL: `https://api.acme-example.com/v2`



\## Authentication



\### API Keys

All requests require an API key passed via the `Authorization` header:
API keys can be generated from the developer portal. Each key has scopes (read, write, admin).
Keys expire after 1 year and must be rotated.

### Rate Limits
- Free tier: 100 requests per minute
- Pro tier: 1,000 requests per minute  
- Enterprise: custom limits

Exceeded rate limits return HTTP 429 with a `Retry-After` header.

## Core Endpoints

### GET /users
List all users in your organization.
Query params: `limit` (default 50), `offset` (default 0).
Returns: array of User objects.

### POST /users
Create a new user.
Required body: `email`, `name`, `role`.
Returns: created User object with ID.

### GET /billing/invoices
List invoices for your account.
Query params: `start_date`, `end_date`, `status` (paid|unpaid|overdue).

### POST /resources/provision
Provision a new compute resource.
Required body: `resource_type`, `region`, `size`.
Async — returns a job ID; poll `/jobs/{id}` for status.

## Error Codes
- `400` Bad Request — invalid input
- `401` Unauthorized — missing or invalid API key
- `403` Forbidden — insufficient scope
- `404` Not Found — resource doesn't exist
- `429` Too Many Requests — rate limit exceeded
- `500` Internal Server Error — contact support

## Webhooks
Configure webhooks at https://developers.acme-example.com/webhooks.
Events delivered as POST requests with HMAC-SHA256 signatures.
Retry policy: exponential backoff for up to 24 hours.

## SDKs
- Python: `pip install acme-sdk`
- Node.js: `npm install @acme/sdk`
- Go: `go get github.com/acme/sdk-go`

