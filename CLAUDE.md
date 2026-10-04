# CLAUDE.md

This file defines the project constraints, architecture, implementation workflow,
and quality bar for the IT Asset Management System (ITAMS).

## Project Summary
IT Asset Management System — tracking and managing IT assets across their lifecycle:
laptops, printers, software licenses, and warranties.

Technology stack:
- Backend: Node.js, Express 5, Knex 3, PostgreSQL 18
- Frontend: React 18, React Router 6, Vite (current major)
- Testing: Vitest, Supertest
- Repository: GitHub

## Repository Expectations
- Work in the current repository.
- Preserve the existing project structure unless a change requires a new file or directory.
- Prefer minimal, targeted changes over broad refactors.
- Keep code readable, explicit, and aligned with the architecture.
- Do not add unnecessary dependencies.
- Do not introduce alternative frameworks or patterns unless explicitly required.
- Prefer consistency with the existing codebase over personal preference.

## Architecture
The codebase must follow a layered architecture:

- Presentation
  - UI components, route definitions, pages/screens
  - Client-side state and form logic
  - API client usage

- Application
  - Use cases / service layer, orchestration logic
  - Validation of application rules
  - Coordination between domain and infrastructure concerns
  - Request/response mapping where needed

- Domain
  - Core business entities, business rules and invariants
  - Value objects, domain services
  - Pure logic that does not depend on Express, Knex, PostgreSQL, or any framework

- Infrastructure
  - Database access, query builders, external integrations
  - Persistence implementations, HTTP adapters, security adapters
  - Logging, auditing, technical concerns

- Composition Root  [BAGO]
  - A single place (e.g. `backend/src/composition/container.ts`) where concrete
    infrastructure adapters are instantiated and injected into application services.
  - Routes, controllers, and services must never construct their own dependencies.

## Hard Rules
These rules are mandatory.

1. Domain must not depend on Express.
2. Domain must not depend on Knex.
3. Domain must not depend on PostgreSQL.
4. Controllers must not contain business logic.
5. Routes must not query PostgreSQL directly.
6. Knex belongs in Infrastructure.
7. Use server-side authorization.
8. Validate external input.
9. Never hardcode secrets.
10. Important operations require audit trails.
11. Do not bypass domain logic with direct database writes from controllers or routes.
12. Keep infrastructure concerns out of domain code.
13. [DAGDAG] No hardcoded, mocked, or seed data may be returned from a repository
    implementation. A repository either reads/writes PostgreSQL or throws.
14. [DAGDAG] A repository must never silently swallow an error. If persistence fails,
    the failure must propagate to the caller.
15. [DAGDAG] Application services must be constructed with injected dependencies;
    no `new Repository()` inside a route, controller, or service body.
16. [DAGDAG] Every API response must follow the standard envelope (see API Contract).
17. [DAGDAG] Every file must compile and lint clean before it is committed. No stray
    characters, no commented-out code, no unused imports.

## API Contract  [BAGO]
All endpoints under `/api` return one of two envelopes.

Success:
{ "success": true, "data": <payload> }

Failure:
{ "success": false, "error": { "code": "<MACHINE_CODE>", "message": "<human message>" } }

Rules:
- HTTP status carries the class (200/201/400/401/403/404/409/500).
- `error.code` is a stable machine-readable string (e.g. ASSET_TAG_EXISTS, NOT_FOUND).
- Never return stack traces, SQL, table names, or internal paths in a response.
- Never return raw driver errors to the client.

## Error Handling  [BAGO]
- Domain throws typed domain errors, not bare `Error` with a string.
- Application services catch domain errors and map them to the API contract.
- The presentation layer translates application failures to the failure envelope.
- Unexpected errors are logged server-side with a correlation id and returned as
  a generic 500 message. Secrets and personal data must never appear in logs.

## Layering Rules
- Controllers are thin adapters.
- Routes define HTTP entry points only.
- Use application services for use cases.
- Persist data through infrastructure adapters only.
- Domain logic must remain framework-agnostic and testable.
- Infrastructure must implement interfaces/contracts required by higher layers.
- Presentation must not contain business rules or persistence logic.

## Data Access Rules
- PostgreSQL access must be implemented in Infrastructure.
- Knex migrations, query builders, and repository implementations belong in Infrastructure.
- Application and Domain layers depend on repository interfaces, not concrete database libraries.
- Avoid direct SQL in routes, controllers, or domain logic.
- [DAGDAG] PostgreSQL syntax only. `AUTO_INCREMENT`, `USE <db>`, and backtick quoting are
  MySQL syntax and are forbidden. Use `GENERATED ALWAYS AS IDENTITY` or `SERIAL`.
- [DAGDAG] Schema changes are delivered as Knex migrations, not hand-run SQL scripts.

## Authorization Rules
- Authorization must be enforced server-side.
- Do not rely only on frontend visibility to restrict access.
- All protected actions must verify user permissions and ownership rules in server-side logic.
- Enforce entitlement checks before performing state-changing operations.
- Default to deny when authorization is unclear.
- [DAGDAG] Roles are explicit and enumerated. Any new role must be added to the role
  constants, the authorization checks, and the test suite in the same change.

## Validation Rules
- Validate all incoming request data before processing.
- Validate data at the boundary layer (controllers, routes, input adapters, or application layer).
- Reject invalid or malformed input early.
- Validate both shape and business constraints.
- Do not trust frontend or client-provided input.
- [DAGDAG] Validation failure returns 400 with a field-level message list.

## Security Rules
- Never hardcode secrets.
- Use environment variables or secure secret management.
- Do not commit .env files to source control.
- Do not log secrets, tokens, or sensitive personal data.
- Avoid exposing internal implementation details in API responses.
- Ensure authorization and audit logging are in place for sensitive operations.
- [DAGDAG] `.env` is never read outside the infrastructure configuration module.
- [DAGDAG] The application connects to the database with a dedicated application user,
  never the PostgreSQL superuser.

## Audit Trail Rules
Important operations must create audit records.

Audit trail requirements:
- Record the actor performing the action.
- Record the action type.
- Record the target entity or resource.
- Record timestamps.
- Record previous and/or new state when appropriate.
- Record the reason or source when available.
- Ensure key changes are traceable for internal and external audit review.

Important operations include:
- Asset creation
- Asset assignment changes
- Asset transfer
- Deletion or disposal
- Warranty or maintenance updates
- Procurement or contract changes
- License assignment or entitlement changes
- Security-related changes
- Permission changes
- Any state transition with business impact

[DAGDAG] Audit rules:
- Audit records are append-only. There is no update or delete path for audit rows,
  in the API or in the repository interface.
- Audit writing happens in one place — an audit service called by the application layer —
  not duplicated per controller.
- The audit record captures the actor id, actor role, action, entity type, entity id,
  timestamp in UTC, and the before/after values of changed fields.
- A failed audit write must fail the operation it accompanies.

## Development Workflow
Before implementing, complete the following in order:

1. Read requirements.
2. Read architecture.
3. Inspect repository.
4. Plan changes.
5. Implement the smallest vertical slice.
6. Test.
7. Verify.
8. Review.
9. Update documentation.

## Change Management Rules
- Prefer the smallest possible change that satisfies the requirement.
- Keep scope tight and avoid speculative work.
- If the requirement is unclear, ask clarifying questions before implementation.
- Do not over-engineer.
- Keep new files focused and purpose-specific.
- Ensure the change is consistent with the existing architecture.

## Implementation Standards
- Write code that is explicit and maintainable.
- Favor small functions and clear responsibilities.
- Use descriptive names.
- Separate business logic from transport logic.
- Separate database logic from domain logic.
- Keep controllers free from business behavior.
- Add comments only where necessary to clarify intent.
- Avoid dead code and unused abstractions.
- [DAGDAG] No `console.log` as application logging. Use the logging adapter.

## Testing Standards
Testing is required.

Minimum expectations:
- Test the changed behavior.
- Confirm edge cases relevant to the change.
- Validate authorization rules.
- Validate validation of external input.
- Validate audit trail generation when required.
- Test failure cases as well as success paths.

Test rules:
- Write tests for business rules in the domain/application layer where possible.
- Keep tests focused and deterministic.
- Prefer testing behavior over implementation detail.
- Never claim something works without verification.
- Do not rely on manual reasoning alone when a test is available.
- [DAGDAG] Every repository implementation must have at least one integration test
  against a real PostgreSQL instance. A repository with zero integration tests is
  considered unimplemented.
- [DAGDAG] `npm test` must pass before a feature branch is pushed.

## Verification Rules
Before claiming success:
- Run the relevant tests.
- Run relevant linting or type checks if configured.
- Verify the changed behavior using the smallest practical validation path.
- Confirm the architecture rules were respected.
- Confirm no direct database access was added to routes or controllers.
- Confirm audit logging was implemented where required.
- Confirm auth checks are server-side.

If verification is not possible, do not claim the change is complete or working.

## Code Review Expectations
Review changes for:
- Architecture compliance
- Security correctness
- Input validation
- Authorization enforcement
- Audit trail coverage
- Test coverage
- Minimal scope
- Documentation updates
- [DAGDAG] Presence of hardcoded or mocked data in production code paths

## Documentation Expectations
When a feature or change is implemented:
- Update any relevant documentation or README content.
- Keep business requirements, architecture notes, or API docs aligned with the actual implementation.
- Document assumptions and constraints if they matter to the project.
- Ensure docs reflect the real behavior, not aspirational behavior.

## Project-Specific Guidance
This project is an IT Asset Management System.

Focus areas:
- Asset lifecycle tracking
- Ownership and assignment management
- Software and license management
- Warranty and maintenance tracking
- Reporting and inventory visibility
- Auditability and governance
- Security and authorization

Keep domain logic centered on business realities such as:
- asset status transitions
- assignment rules
- return and disposal logic
- lifecycle validation
- compliance checks
- approval conditions

Asset categories in scope: Laptop, Desktop, Printer, Monitor, Network Device,
Software License, Warranty Contract.

Core domain invariants:
- An asset cannot be assigned to two people at once.
- An asset cannot be assigned while in Maintenance, Retired, or Disposed status.
- Status transitions follow a defined allowed set, not free text.
- A disposed asset cannot be reassigned.
- A license cannot consume more seats than it owns.
- An expired warranty cannot be marked active.

Do not allow infrastructure or HTTP details to leak into domain logic.

## Final Operating Principle
The code must reflect the real business process, not just database tables. The system
should be robust, governable, auditable, and secure.

Never claim something works without verification.
Never bypass the architecture.
Never compromise the domain boundary.
Never hardcode secrets.
Never ignore auditability for important operations.
Never let routes or controllers contain business logic.
Never ship mocked data as if it were real.

## Required Output Style
When generating code or implementing a change:
- Keep responses concise and professional.
- Prefer precise file-level changes.
- Respect the existing repository and architecture.
- Favor small vertical slices over large rewrites.
- Include only relevant context in code diffs or explanations.
- Do not claim success without verification evidence.
- State which files changed and which command was run to verify it.
