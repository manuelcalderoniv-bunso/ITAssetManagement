# CLAUDE.md

This file defines the project constraints, architecture, implementation workflow, and quality bar for the IT Asset Management application.

## Project Summary
This project is an IT Asset Management system for tracking and managing IT assets across their lifecycle.

Technology stack:
- Backend: Node.js, Express 4, Knex 3, PostgreSQL
- Frontend: React 18, React Router 6, Vite 5
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
  - UI components
  - Route definitions
  - Pages/screens
  - Client-side state and form logic
  - API client usage

- Application
  - Use cases / service layer
  - orchestration logic
  - validation of application rules
  - coordination between domain and infrastructure concerns
  - request/response mapping where needed

- Domain
  - Core business entities
  - Business rules and invariants
  - Value objects
  - Domain services
  - Pure logic that does not depend on Express, Knex, PostgreSQL, or any framework

- Infrastructure
  - Database access
  - Query builders
  - External integrations
  - Persistence implementations
  - HTTP adapters
  - Security adapters
  - Logging, auditing, and technical concerns

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
- Application and Domain layers should depend on repository interfaces, not concrete database libraries.
- Avoid direct SQL in routes, controllers, or domain logic.

## Authorization Rules
- Authorization must be enforced server-side.
- Do not rely only on frontend visibility to restrict access.
- All protected actions must verify user permissions and ownership rules in server-side logic.
- Enforce entitlement checks before performing state-changing operations.
- Default to deny when authorization is unclear.

## Validation Rules
- Validate all incoming request data before processing.
- Validate data at the boundary layer (controllers, routes, input adapters, or application layer).
- Reject invalid or malformed input early.
- Validate both shape and business constraints.
- Do not trust frontend or client-provided input.

## Security Rules
- Never hardcode secrets.
- Use environment variables or secure secret management.
- Do not commit .env files to source control.
- Do not log secrets, tokens, or sensitive personal data.
- Avoid exposing internal implementation details in API responses.
- Ensure authorization and audit logging are in place for sensitive operations.

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

## Documentation Expectations
When a feature or change is implemented:
- Update any relevant documentation or README content.
- Keep business requirements, architecture notes, or API docs aligned with the actual implementation.
- Document assumptions and constraints if they matter to the project.
- Ensure docs reflect the real behavior, not aspirational behavior.

## Project-Specific Guidance
This project is an IT Asset Management application.

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

Do not allow infrastructure or HTTP details to leak into domain logic.

## Final Operating Principle
The code must reflect the real business process, not just database tables. The system should be robust, governable, auditable, and secure.

Never claim something works without verification.
Never bypass the architecture.
Never compromise the domain boundary.
Never hardcode secrets.
Never ignore auditability for important operations.
Never let routes or controllers contain business logic.

## Required Output Style
When generating code or implementing a change:
- Keep responses concise and professional.
- Prefer precise file-level changes.
- Respect the existing repository and architecture.
- Favor small vertical slices over large rewrites.
- Include only relevant context in code diffs or explanations.
- Do not claim success without verification evidence.