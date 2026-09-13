# Threat Model for IT Asset Management System

This document identifies security and operational risks relevant to the IT Asset Management System based on the project requirements, architecture, backlog, and security design constraints. The goal is to reduce risk before implementation and to guide secure design decisions for the MVP and future releases.

## Threat Inventory

THREAT-001

Threat:
Unauthorized access to asset records through broken authorization or IDOR.

Risk:
CRITICAL

Affected Components:
- Presentation Layer
- Application Layer
- Infrastructure Layer
- Asset repository
- API routes and controllers
- Authorization middleware

Attack Scenario:
An attacker modifies the asset ID in a request URL or API payload to access records outside their department, ownership scope, or role. Because authorization is only checked at the UI or not verified server-side, the attacker can read, modify, or delete another user’s asset records.

Controls:
- Server-side authorization on every protected action
- Resource-level ownership and department checks
- Default deny access model
- Role-based permissions matrix
- Validation of user identity and scope before processing requests
- Strict route and handler-level access checks

Mitigation:
Enforce authorization at the application service layer and verify user permissions against the target resource before performing any read, update, delete, transfer, or disposal action. Treat asset IDs, assignment IDs, and approval IDs as untrusted references requiring server-side validation.

---

THREAT-002

Threat:
Privilege escalation through role manipulation or insecure permission updates.

Risk:
CRITICAL

Affected Components:
- Authentication module
- Authorization model
- User management
- Audit log
- Application services

Attack Scenario:
An unauthorized user tampers with a request that updates user roles or permission assignments, causing elevated access. If role changes are not protected by server-side authorization and audit controls, an attacker may gain access to asset, approval, or compliance data.

Controls:
- Authorization checks for role changes
- Restricted admin-only endpoints
- Immutable or tightly controlled role management
- Audit trail for permission changes
- MFA for privileged roles

Mitigation:
Restrict role and permission changes to a small set of trusted administrative workflows. Require server-side authorization, audit recording, and validation for every role-changing action.

---

THREAT-003

Threat:
SQL injection or malicious query construction through untrusted inputs.

Risk:
CRITICAL

Affected Components:
- Infrastructure Layer
- Knex query layer
- PostgreSQL access layer
- API routes and request validation

Attack Scenario:
A malicious input is passed through a route, form, or query parameter into a database query. If input is not validated and parameterized correctly, the attacker can alter query logic or extract unauthorized data.

Controls:
- Knex parameterized queries
- Validation at API boundary
- Strict input type checking
- Database-level constraints
- Repository abstraction over raw SQL logic
- Minimal database privileges

Mitigation:
Keep all database access inside Infrastructure and use parameterized query builders. Do not concatenate user input into SQL statements. Validate all external input before it reaches repository or query logic.

---

THREAT-004

Threat:
Cross-site request forgery (CSRF) against authenticated asset workflows.

Risk:
HIGH

Affected Components:
- Frontend
- API layer
- Session or token handling
- Protected routes

Attack Scenario:
A user authenticated to the system visits a malicious site that triggers a forged request to the asset management API. If the application does not protect against CSRF, the attacker may trigger asset transfers, approvals, or returns.

Controls:
- CSRF protection for browser-based session workflows
- Secure cookie configuration
- SameSite restrictions
- Token validation for state-changing requests
- Authorization checks on all writes

Mitigation:
Use secure session or token patterns and enforce CSRF protections for all browser-based state-changing actions. Do not rely on frontend UI visibility as a security control.

---

THREAT-005

Threat:
Credential leakage or secret exposure in source code, logs, or configuration.

Risk:
CRITICAL

Affected Components:
- Application configuration
- Deployment environment
- Logging infrastructure
- Secret management
- Git repository

Attack Scenario:
A developer accidentally commits a token, password, private key, or database credential. The secret is later exposed through logs, error output, or repository history, granting unauthorized access to the production environment.

Controls:
- No secrets in source code
- Environment variables only
- .env files excluded from source control
- Secret manager for production secrets
- Structured logging with secret scrubbing
- Restricted access to production credentials

Mitigation:
Never hardcode credentials. Store secrets outside the repository and use environment-specific configuration with strict access control. Ensure logs redact tokens, passwords, and sensitive data.

---

THREAT-006

Threat:
Audit trail tampering or incomplete audit records for high-risk actions.

Risk:
CRITICAL

Affected Components:
- Audit infrastructure
- Application workflows
- Asset lifecycle flows
- Approval workflow
- Database persistence layer

Attack Scenario:
A user changes an asset assignment or disposal record while the corresponding audit record is missing, incomplete, or tampered with. Without a reliable audit trail, the organization cannot prove who made the change or why.

Controls:
- Audit logging for all material actions
- Append-only style storage or protected audit tables
- Transactional coupling where possible between business change and audit record
- Role restrictions for audit access
- Monitoring for failed or missing audit writes

Mitigation:
Make audit records part of the critical workflow design. For any important operation, write the audit entry as part of the same transactional boundary whenever feasible, and alert on failures.

---

THREAT-007

Threat:
Race conditions during asset assignment, transfer, or return.

Risk:
CRITICAL

Affected Components:
- Application services
- Domain logic
- Database transactions
- Assignment repository
- Asset lifecycle logic

Attack Scenario:
Two admins or processes attempt to assign or transfer the same asset simultaneously. Without locking or optimistic concurrency checks, the system may accept duplicate active assignments or overwrite a more recent assignment with stale data.

Controls:
- Transaction boundaries for assignment workflow
- Version checks or optimistic locking
- Unique constraints on active assignment records
- Domain validation to prevent duplicate active assignments
- Retry and conflict handling patterns

Mitigation:
Enforce workflow-level transaction control and ensure only one active assignment can exist for an asset at a time. Use database constraints and concurrency-safe update patterns for state-changing operations.

---

THREAT-008

Threat:
Data integrity compromise through partial updates or failed database writes.

Risk:
CRITICAL

Affected Components:
- PostgreSQL database
- Infrastructure repositories
- Application services
- Audit log persistence

Attack Scenario:
An asset update or approval record partially succeeds, but a later step fails. The system may show a newer state without a corresponding audit entry or with inconsistent lifecycle information, causing broken trust and operational risk.

Controls:
- Atomic transactions for critical state changes
- Fail-safe behavior for workflow errors
- Validation before commit
- Transaction rollback on business failure
- Monitoring for partial workflow failures

Mitigation:
Implement transactional boundaries around high-risk operations and ensure rollback or compensation behavior is defined for failed workflows. Avoid leaving the system in a half-applied state.

---

THREAT-009

Threat:
Sensitive employee and procurement metadata exposed through APIs or unsupported responses.

Risk:
HIGH

Affected Components:
- API routes
- Presentation Layer
- Application Layer
- User and asset records
- Reporting endpoints

Attack Scenario:
An endpoint returns more data than the caller is authorized to see, such as assignment history, owner information, vendor details, or procurement metadata. Attackers can use this information for social engineering, internal reconnaissance, or operational disruption.

Controls:
- Server-side role-based authorization
- Field-level access control for sensitive data
- Sanitized API responses
- Restriction of report access by role and scope
- No internal implementation details in error payloads

Mitigation:
Return only the minimum required data per role and permission. Protect sensitive fields with server-side filters and maintain strict access restrictions on user, asset, and report endpoints.

---

THREAT-010

Threat:
Approval bypass or manipulation of business approvals.

Risk:
CRITICAL

Affected Components:
- Approval workflow
- Application services
- User roles
- Asset transfer and disposal workflows
- Audit trail

Attack Scenario:
A user bypasses the approval workflow by directly calling the API, modifying status values, or updating approval records without authorization. This can lead to unauthorized transfers, disposals, or high-value access changes.

Controls:
- Server-side workflow enforcement
- Protected approval endpoints
- Role checks for approvers
- Immutable approval decisions
- Audit trail of approvals and rejections
- Validation of workflow state transitions

Mitigation:
Approval logic must be enforced in the application layer and domain logic, not just in the UI. Every approval event must be auditable and protected from direct bypass or spoofing.

---

THREAT-011

Threat:
Denial of service through expensive report queries or unbounded search requests.

Risk:
HIGH

Affected Components:
- Reporting module
- Search endpoints
- Database performance
- Application scaling
- Infrastructure monitoring

Attack Scenario:
An attacker submits broad, unfiltered queries to dashboards or asset reports, forcing expensive joins, large scans, or high CPU usage. This can slow the database and degrade service availability for legitimate users.

Controls:
- Pagination and filtering
- Query limits
- Rate limiting
- Indexing strategy
- Cache for recurring reports
- Resource usage monitoring

Mitigation:
Apply limits to report queries, enforce pagination and index-based filtering, and monitor resource usage to prevent runaway queries and expensive report generation.

---

THREAT-012

Threat:
Data loss or operational outage during deployment or migration.

Risk:
CRITICAL

Affected Components:
- Deployment pipeline
- PostgreSQL schema
- Backend application
- Audit tables
- Rollback process

Attack Scenario:
A release introduces a schema change or deploys an incompatible app version. The system fails to start, the database schema is out of sync with the app, or a migration partially applies. The organization loses availability or experiences data inconsistency.

Controls:
- Environment separation
- Schema migration process with tested rollback
- Compatibility checks between app and database
- Staged deployment
- Backup and restore verification
- Health checks and deployment gating

Mitigation:
Define a deployment strategy with backward-compatible migrations, backup checks, and rollback procedures. Never deploy a schema change without verifying compatibility and recovery steps.

---

THREAT-013

Threat:
Logging of sensitive data or disclosure through operational log access.

Risk:
HIGH

Affected Components:
- Logging layer
- Application services
- Security events
- API error handling
- Monitoring systems

Attack Scenario:
Sensitive information such as tokens, passwords, asset owner data, or approval metadata is captured in logs and exposed to unauthorized users or support personnel. This creates a severe risk for data leakage and unauthorized reconnaissance.

Controls:
- Structured logging
- Secret scrubbing
- Redacted payload logging
- Restriction of log access
- Monitoring for sensitive value leakage
- Standardized log retention policy

Mitigation:
Ensure logs do not contain secrets or sensitive payloads. Implement redaction and role-based access controls for operational logs and monitoring systems.

---

THREAT-014

Threat:
Unauthorized manipulation of asset lifecycle state or status transitions.

Risk:
HIGH

Affected Components:
- Domain Layer
- Asset state machine
- Application services
- Audit trail
- Asset repository

Attack Scenario:
An attacker sends a crafted request to force an asset into a different lifecycle state without proper authorization or business validation, such as marking a device as disposed or returned without the required actions. This can affect compliance and operational integrity.

Controls:
- Domain rules for valid status transitions
- Authorization on lifecycle changes
- Application-level validation
- Audit records for state transitions
- Database constraints and workflow validation

Mitigation:
Model lifecycle transitions explicitly in the domain logic and enforce them in application services. Do not allow runtime state mutation without validation or approval checks.

---

THREAT-015

Threat:
Insufficient recovery after system compromise, outage, or data corruption.

Risk:
HIGH

Affected Components:
- PostgreSQL backups
- Deployment controls
- Monitoring
- Security incident response
- Application and data recovery

Attack Scenario:
A production issue occurs due to a compromised admin account, failed deployment, or data corruption. Without a tested restore plan, the team cannot quickly recover the asset system and may lose legally required records or operational continuity.

Controls:
- Regular database backups
- Encrypted backup storage
- Restore drill process
- Incident response plan
- Monitoring and alerting
- Recovery testing

Mitigation:
Establish a recovery plan for data loss, outage, and compromise. Backups must be encrypted, tested, and protected from unauthorized restore access.

---

## Summary of Key Risk Areas
The highest-risk areas in this project are:
- authorization and IDOR prevention
- audit integrity
- asset lifecycle and assignment concurrency
- approval workflow bypass
- database and deployment safety
- secret management
- report and API abuse

These areas must be addressed before production rollout and should be revisited during every major feature addition.

## Priority Risk Ranking
1. Broken authorization / IDOR
2. Audit trail tampering or missing audit records
3. Assignment and transfer race conditions
4. Approval bypass
5. Secret leakage
6. Partial database update and migration failure
7. Report abuse and resource exhaustion
8. Data exposure through API responses
9. Deployment or rollback failure
10. Logging of sensitive data

This threat model should be reviewed and updated as the system evolves, especially when new workflows, integrations, or user roles are introduced.