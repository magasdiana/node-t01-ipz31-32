# API Bugs and QA Findings

## BUG-001: GET /staff returns HTTP 500

- **Endpoint:** `GET /staff`
- **Status:** Confirmed
- **Severity:** High
- **Expected result:** HTTP 200 with a list of staff members.
- **Actual result:** HTTP 500 Internal Server Error.
- **Details:** In `src/modules/staff/staff.service.js`, the Prisma query uses `staff_subjects`, while the available relation is named `staffSubjects`.
- **Impact:** The staff list endpoint does not work correctly.
- **Recommended action:** Verify the Prisma relation name and update the query.

## BUG-002: GET /reports/profit returns HTTP 404

- **Endpoint:** `GET /reports/profit`
- **Status:** Needs confirmation
- **Expected result:** Depends on whether this endpoint is part of the agreed API requirements.
- **Actual result:** HTTP 404 Not Found.
- **Details:** The reports router does not currently implement this endpoint.
- **Recommended action:** Confirm whether the endpoint is required. If it is not implemented by design, exclude it from the current API test scope.

## BUG-003: GET /reports/min-rooms returns HTTP 404

- **Endpoint:** `GET /reports/min-rooms`
- **Status:** Needs confirmation
- **Expected result:** Depends on whether this endpoint is part of the agreed API requirements.
- **Actual result:** HTTP 404 Not Found.
- **Details:** The reports router does not currently implement this endpoint.
- **Recommended action:** Confirm whether the endpoint is required. If it is not implemented by design, exclude it from the current API test scope.

## BUG-004: PUT /settings/prices accepts an empty request body

- **Endpoint:** `PUT /settings/prices`
- **Status:** Needs specification confirmation
- **Request body:** `{}`
- **Expected result:** HTTP 400 if at least one price setting is required.
- **Actual result:** HTTP 200 OK.
- **Details:** The current validation schema allows all fields to be optional.
- **Impact:** An empty update may be accepted without changing any settings.
- **Recommended action:** Confirm whether an empty update should be rejected. Update the validation expectations according to the agreed requirements.

## Pending manual verification

The following valid requests still need to be tested manually. No conclusion should be recorded until the actual responses are checked.

- **POST /staff** — verify that a valid staff member can be created.
- **POST /subjects** — verify that a valid subject can be created.
- **POST /payments** — verify that a valid payment can be created.
- **PUT /settings/prices** — verify that a valid price update is accepted.

For each request, record the request body, HTTP status code, response body, and whether the result matches the API requirements.
