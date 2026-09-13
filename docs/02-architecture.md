# IT Asset Management System Architecture

## 1. System Overview
The IT Asset Management System is a web-based application designed to centralize asset tracking, lifecycle management, software compliance, maintenance, approval workflows, and reporting across the organization.

The solution will support:
- Hardware asset lifecycle management
- Asset assignment and return tracking
- Warranty and maintenance tracking
- Software license management
- Audit and compliance reporting
- Role-based access control
- Operational and management dashboards

The architecture follows a layered design to preserve maintainability, security, and separation of concerns. The system will use:
- Frontend: React 18 + React Router 6 + Vite 5
- Backend: Node.js + Express 4
- Data Access: Knex 3
- Database: PostgreSQL
- Repository: GitHub

The system is designed around a centralized source of truth for IT assets and associated operational events.

## 2. Architecture Principles
The architecture must follow these core rules:

1. Separation of concerns
   - Presentation logic is separate from application logic.
   - Domain logic is separate from persistence and infrastructure concerns.
   - Infrastructure handles database and external integration concerns.

2. Domain independence
   - Domain must not depend on Express.
   - Domain must not depend on Knex.
   - Domain must not depend on PostgreSQL.

3. Thin transport layer
   - Controllers are adapters only.
   - Routes define HTTP entry points only.
   - Routes must not directly query PostgreSQL.

4. Server-side authorization
   - All protected actions must be authorized on the server.
   - Frontend visibility must never be the only enforcement mechanism.

5. Validation at boundaries
   - All external input must be validated before business processing.
   - Validation must happen before reaching domain logic.

6. Auditability
   - Important operations must generate audit records.
   - Audit trails must capture who did what, when, and why.

7. Security by default
   - No hardcoded secrets.
   - Sensitive information must be protected and only exposed to authorized roles.

8. Smallest vertical slice first
   - New features should be implemented in small, testable slices aligned to the backlog and MVP.

## 3. Layered Architecture
The application follows a four-layer architecture:

- Presentation Layer
- Application Layer
- Domain Layer
- Infrastructure Layer

This layering ensures business rules remain independent from transport and persistence concerns.

## 4. Presentation Layer
The Presentation Layer is responsible for:
- Rendering the user interface
- Handling routing
- Capturing user input
- Calling backend APIs
- Displaying feedback and validation messages

Technology:
- React 18
- React Router 6
- Vite 5

Responsibilities:
- Pages and screens
- UI components
- Form components
- Route configuration
- Client-side navigation
- API client logic
- Displaying status, alerts, and summary information

Constraints:
- The Presentation Layer must not contain business rules.
- It must not directly manipulate the database.
- It must not contain domain logic.
- It may handle basic client-side validation for UX, but server-side validation remains authoritative.

Example responsibilities:
- Asset list page
- Asset details page
- Assignment form
- Disposal workflow page
- Dashboard page
- Login and user profile views

## 5. Application Layer
The Application Layer orchestrates use cases and coordinates business operations.

Responsibilities:
- Application services / use cases
- Validation of application-level rules
- Request-to-domain mapping
- Coordinating repository calls
- Handling workflow orchestration between domain and infrastructure
- Authorization checks at the application boundary when needed

This layer acts as the bridge between:
- Presentation input and user intent
- Domain business rules and repository behavior
- Infrastructure persistence

Constraints:
- This layer does not own database logic.
- This layer does not contain low-level database queries.
- This layer should not bypass domain rules.

Typical application services:
- CreateAsset
- UpdateAsset
- AssignAsset
- ReturnAsset
- DisposeAsset
- TrackWarranty
- RecordMaintenanceEvent
- CreateSoftwareLicense
- ReviewSoftwareCompliance
- GenerateAssetDashboardSummary

## 6. Domain Layer
The Domain Layer contains the heart of the business logic. It defines the core business model and enforces invariants.

Responsibilities:
- Core entities
- Value objects
- Domain rules
- State transitions
- Validation of business policies
- Lifecycle logic
- Approval criteria
- Compliance checks
- Ownership and assignment rules

Examples of domain concepts:
- Asset
- AssetStatus
- LifecycleState
- Assignment
- User
- Department
- Warranty
- MaintenanceRecord
- SoftwareLicense
- AssetTransfer
- DisposalRecord

Important domain rules:
- An asset cannot have more than one active assignment at a time.
- An asset cannot transition to an invalid lifecycle state.
- Assignments must be auditable.
- Disposal requires policy-compliant handling.
- Missing or overdue assets must trigger exception logic.
- Software entitlement and assignment must align with licensing policies.

Constraints:
- Domain must not depend on Express.
- Domain must not depend on Knex.
- Domain must not depend on PostgreSQL.
- Domain should be pure and testable.
- Domain logic must not contain database calls or HTTP concepts.

## 7. Infrastructure Layer
The Infrastructure Layer implements technical concerns and external systems.

Responsibilities:
- PostgreSQL access through Knex
- Repository implementations
- Query builders and database adapters
- External service integrations
- Authentication and authorization adapters
- Audit log persistence
- Logging and monitoring
- Secret management integration
- Email or notification adapters if introduced later

This layer is where all technology-specific implementation exists.

Examples:
- KnexAssetRepository
- KnexLicenseRepository
- KnexAuditLogRepository
- AuthServiceAdapter
- UserPermissionProvider
- LoggerAdapter
- NotificationServiceAdapter

Constraints:
- Knex belongs in Infrastructure.
- Routes and controllers must not directly interact with PostgreSQL.
- Infrastructure should implement interfaces expected by the Application or Domain layers.

## 8. Repository Pattern
The Repository Pattern is used to abstract persistence concerns from the application and domain layers.

The repository pattern allows:
- Domain logic to remain independent of database details
- The application layer to work with interfaces rather than concrete implementations
- Easier testing and replacement of data sources

Repository responsibilities:
- Persist entities
- Query entities by identifier or criteria
- Save lifecycle or assignment state
- Create audit records
- Retrieve asset, license, and assignment data

Repository examples:
- AssetRepository
- AssignmentRepository
- SoftwareLicenseRepository
- AuditLogRepository
- MaintenanceRecordRepository

Implementation:
- Repositories are implemented in Infrastructure using Knex and PostgreSQL.
- Application layer depends on repository interfaces, not database-specific code.

## 9. Module Structure
The project should organize code by business capability and technical layer. A recommended structure is:

- src/
  - app/
    - assets/
    - assignments/
    - licenses/
    - warranties/
    - maintenance/
    - reports/
    - audit/
    - auth/
    - users/
  - domain/
    - assets/
    - assignments/
    - licenses/
    - audit/
    - shared/
  - infrastructure/
    - db/
      - knex/
      - migrations/
      - seeds/
    - repositories/
    - auth/
    - audit/
    - logging/
  - presentation/
    - components/
    - pages/
    - routes/
    - hooks/
    - services/
    - layouts/
  - server/
    - app.js
    - config/
    - middleware/
    - routes/
  - shared/
    - utils/
    - constants/
    - validation/

This structure keeps domain and infrastructure concerns distinct while supporting a manageable growth path.

## 10. Authentication and Authorization
Authentication and authorization are required at the server boundary.

Authentication:
- Validate user identity before allowing access
- Use secure session or token-based authentication
- Protect API routes with authentication middleware
- Keep secret management outside source control

Authorization:
- Enforce permissions on server-side logic
- Check role and ownership before processing updates, transfers, disposals, or reports
- Enforce least-privilege access
- Deny access by default when the permission cannot be verified

Roles may include:
- IT Administrator
- IT Manager
- Department Manager
- Finance / Procurement
- Security / Compliance
- Support / Help Desk
- Executive / Leadership

Authorization examples:
- Only IT administrators can create or delete asset records.
- Department managers may approve asset assignments for their department.
- Finance users can access costs and spend reports.
- Security users can view compliance exceptions.
- Executives can access summary dashboards, not full operational detail.

## 11. Audit Trail Architecture
The system must record material operations for traceability and audit readiness.

Important operations include:
- Asset creation
- Asset updates
- Assignment events
- Transfers
- Returns
- Disposals
- Warranty updates
- Maintenance events
- License assignment changes
- Role or permission changes
- Security-sensitive events

Audit log structure:
- audit_id
- entity_type
- entity_id
- action_type
- actor_id
- actor_name
- timestamp
- previous_value
- new_value
- reason
- source
- ip_address or request metadata if relevant

Audit trail responsibilities:
- Capture actor identity
- Preserve before/after state when possible
- Record timestamps and reasons
- Support internal review and external audit needs
- Remain protected from tampering or unauthorized modification

Implementation:
- Audit generation belongs to the application or infrastructure layer depending on orchestration design.
- Persistence of audit records belongs in Infrastructure.
- Domain logic should not be burdened with HTTP or DB concerns.

## 12. Database Architecture
The database is PostgreSQL and will be accessed via Knex 3.

Database responsibilities:
- Store asset, assignment, warranty, maintenance, and license data
- Persist audit records
- Track relationship data between assets, users, departments, and vendors
- Support reporting and compliance queries
- Provide structured data for dashboards and analytics

Core database concepts:
- Assets
- Users
- Departments
- Locations
- Vendors
- Asset assignments
- Warranty records
- Maintenance records
- Software licenses
- Software assignments
- Audit log entries
- Approvals and workflow state

Data design principles:
- Use normalized schemas for master data
- Keep historical records for assignments and states
- Encode statuses with well-defined domain constraints
- Keep audit tables separate from operational tables where possible
- Keep database access in Infrastructure

## 13. API Design Approach
The Backend will expose HTTP APIs through Express 4.

API design principles:
- Thin route handlers
- Controller actions are adapters
- Business logic is in application services
- Request validation occurs before the use case
- Authorization is enforced on the server
- Responses return only required data

Example API areas:
- /api/assets
- /api/assignments
- /api/licenses
- /api/warranties
- /api/maintenance
- /api/reports
- /api/audit
- /api/approvals

API governance:
- Validate all input
- Use structured responses for validation and authorization failures
- Avoid exposing database or stack details
- Ensure status transitions and important actions generate audit entries

## 14. Deployment Architecture
The system will likely be deployed as a standard web application with separate frontend and backend responsibilities.

Recommended deployment model:
- Frontend served through Vite build output or a static front-end hosting layer
- Backend deployed as a Node.js service
- PostgreSQL deployed as a managed or dedicated database service
- Environment variables used for configuration and secrets
- Secure networking and role-based deployment access

Deployment considerations:
- Production configuration stored outside source control
- Separate environment configuration for development, test, and production
- Independent health checks for API and database connectivity
- Logging and monitoring for operational visibility

## 15. Folder Structure
A recommended folder structure for the repository is:

- docs/
  - 00-product-idea.md
  - 01-requirements.md
  - 02-architecture.md
  - 03-backlog.md

- src/
  - app/
  - domain/
  - infrastructure/
  - presentation/
  - server/
  - shared/

- tests/
  - app/
  - domain/
  - integration/
  - e2e/

- .env.example
- .gitignore
- package.json
- vite.config.js
- server.js
- README.md

This structure supports the separated architecture while keeping the repository understandable and maintainable.

## 16. Scalability Strategy
The solution should be designed to grow from a focused operational tool into a broader enterprise governance platform.

Scalability approach:
- Start with a small but complete MVP for asset inventory, assignment, lifecycle, and auditing
- Expand with additional modules such as software compliance, reporting, and approvals
- Add modules without breaking the domain boundaries
- Use repository abstraction to support future persistence changes
- Keep UI and backend decoupled for independent evolution
- Add role-based and policy-based access as operational complexity grows

Future growth areas:
- Additional asset categories
- More integrations with ERP, endpoint management, and procurement systems
- Deeper reporting and analytics
- Expansion to cloud subscriptions and vendor contracts
- More advanced approval and exception workflows

## 17. Design Constraints
The implementation must adhere to the following constraints:

- Domain-free from Express, Knex, and PostgreSQL dependencies
- Controllers remain thin
- Routes are not direct data access points
- Knex remains in Infrastructure
- All external input is validated
- Authorization is enforced server-side
- Important operations are audited
- No secrets are hardcoded or committed to source control

## 18. Architectural Summary
This architecture gives the project a reliable foundation for building a secure and maintainable IT Asset Management system.

It is intentionally structured to:
- protect the business rules
- keep the domain independent from framework and database concerns
- enforce strong security and authorization
- support audit and compliance requirements
- allow phased delivery from MVP to future-state enhancements

The result is an application that can grow from a focused asset tracking tool into a governance platform without sacrificing maintainability or integrity.