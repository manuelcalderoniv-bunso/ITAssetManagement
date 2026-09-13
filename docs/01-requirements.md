# IT Asset Management System Requirements

## 1. Overview
This document defines the functional and non-functional requirements for the IT Asset Management (ITAM) system. The purpose of the system is to centralize asset records, improve governance, reduce operational risk, and provide lifecycle visibility for all IT hardware and software assets used by the organization.

The solution must support the management of:
- Laptops
- Desktop computers
- Monitors
- Printers
- Mobile devices
- Network equipment
- Software licenses
- IT accessories

The system must replace the current fragmented approach based on spreadsheets, emails, verbal requests, and manual recordkeeping.

## 2. Functional Requirements

### 2.1 Core Asset Inventory
The system shall:
- Maintain a centralized inventory of all IT assets
- Track asset categories and subcategories
- Store unique identifiers for each asset
- Record manufacturer, model, serial number, purchase date, cost, and status
- Record asset location, department, and assigned owner
- Track asset lifecycle stage
- Support search and filtering across all asset records
- Allow creation, update, and deletion of asset records according to authorization rules

### 2.2 Asset Lifecycle Management
The system shall:
- Support lifecycle stages such as received, assigned, in use, repaired, returned, retired, and disposed
- Record the date for each lifecycle event
- Track asset age and expected lifecycle milestones
- Support end-of-life and refresh planning
- Flag assets approaching end-of-support, warranty expiry, or replacement thresholds

### 2.3 Assignment and Ownership
The system shall:
- Track the assigned user, department, and location for each asset
- Support asset reassignment and transfer
- Store historical assignment records
- Identify assets that are missing, overdue, or unreturned
- Support ownership accountability by department or business unit

### 2.4 Warranty Management
The system shall:
- Record warranty start and end dates
- Track warranty provider and service coverage
- Notify users when warranty dates are near expiry
- Associate warranty status with the asset record

### 2.5 Maintenance Management
The system shall:
- Track maintenance records and service events
- Record service dates, provider, issue description, and resolution
- Link maintenance events to the specific asset
- Trigger alerts for scheduled maintenance or support deadlines

### 2.6 Software License Management
The system shall:
- Track software products, licenses, vendors, and terms
- Record license entitlements and assigned devices or users
- Track software installation status where applicable
- Support compliance review of software usage and license counts
- Identify underused, over-licensed, or unapproved software
- Support audit reporting for software compliance

### 2.7 Procurement and Asset Intake
The system shall:
- Record procurement date, vendor, purchase order, and cost
- Associate purchased assets with vendor or supplier records
- Support intake of received assets into the inventory
- Link assets to corresponding purchase records

### 2.8 Asset Disposal and Retirement
The system shall:
- Support retirement, write-off, and disposal workflows
- Record reason for disposal
- Require approval for disposal actions
- Retain asset history after retirement for audit purposes

### 2.9 Search and Reporting
The system shall:
- Provide search by asset name, serial number, owner, location, category, status, and device type
- Support filtered reporting by department, site, lifecycle status, category, and vendor
- Produce operational and management reports
- Export reports in standard formats where applicable

### 2.10 User Experience
The system shall:
- Provide role-based access to asset data
- Provide clear status indicators for asset state
- Support basic dashboard views for asset counts and trends
- Minimize manual effort required to maintain asset records

## 3. Non-Functional Requirements

### 3.1 Performance
- The system shall provide responsive search and listing for standard operational use.
- Reporting must complete within acceptable time thresholds for typical business volumes.
- The system shall support growth in asset volume without significant redesign.

### 3.2 Reliability
- The system shall maintain data integrity during normal operations.
- Critical business data must be protected from accidental overwrite or deletion.
- The system must support recovery from user input errors and operational faults.

### 3.3 Scalability
- The system shall be designed to handle increasing assets, users, and transaction volume over time.
- It must support additional asset classes and future integrations without major architectural rework.

### 3.4 Maintainability
- The application shall follow a layered architecture to separate presentation, application, domain, and infrastructure concerns.
- Code shall be organized so business rules are separate from database and HTTP concerns.
- Domain logic must remain independent from Express, Knex, and PostgreSQL.

### 3.5 Usability
- The system shall be easy to use for IT administrators and managers.
- Standard workflows such as assignment, transfer, and return must be clear and efficient.
- The interface must provide actionable visibility into asset status, risk, and compliance.

### 3.6 Availability
- The system shall be available during normal business hours and support reasonable operational continuity.
- Critical operations such as asset assignment and status changes must be reliable and consistent.

## 4. User Roles

### 4.1 IT Administrator
- Manages asset inventory
- Creates and updates asset records
- Performs assignment, transfer, return, disposal, and maintenance actions
- Configures core metadata and status values
- Reviews reports and exceptions

### 4.2 IT Manager
- Reviews asset inventory and lifecycle status
- Oversees compliance and risk indicators
- Reviews operational reports
- Confirms approvals for escalated requests or disposal actions

### 4.3 Department Manager
- Requests assets for staff or teams
- Reviews and approves asset assignments for their department
- Validates asset return or transfer requests

### 4.4 Finance / Procurement
- Tracks purchasing activity
- Reviews cost and vendor information
- Supports procurement planning and budget tracking
- Reviews software and hardware renewals

### 4.5 Security / Compliance
- Reviews software compliance and security-related asset risk
- Monitors non-compliant or unapproved assets
- Supports audit review and governance controls

### 4.6 Help Desk / Support
- Identifies asset issues and maintenance events
- Records service tickets associated with assets
- Works with IT administrators to resolve device or support issues

### 4.7 Executive / Leadership
- Views summary dashboards and high-level asset indicators
- Reviews asset utilization, risk, lifecycle health, and spending trends

## 5. Asset Lifecycle

The system shall support the following lifecycle stages:
- Ordered
- Received
- Assigned
- In use
- Returned
- Under repair
- Retired
- Disposed

Lifecycle requirements:
- Each asset must have a current lifecycle status
- The system shall maintain historical status changes
- Status changes must be recorded with date and actor
- Certain transitions require approval
- Lifecycle dates must be available for reporting and planning

## 6. Asset Management Requirements

### 6.1 Required Asset Data
For each asset, the system shall store:
- Asset ID or unique identifier
- Asset type
- Category
- Manufacturer
- Model
- Serial number
- Purchase date
- Purchase cost
- Vendor / supplier
- Current owner
- Department
- Location
- Current status
- Assigned user
- Warranty information
- Maintenance history
- Date received
- Disposal or retirement date, if applicable

### 6.2 Asset Categorization
The system shall support:
- Standard categories such as laptop, desktop, monitor, printer, mobile device, network equipment, accessory, and software asset
- Additional categories as needed through configuration

### 6.3 Asset Search and Filtering
The system shall support:
- Search by asset ID, serial number, model, owner, department, location, or status
- Filtering by category, lifecycle stage, location, owner, vendor, and date range

## 7. Assignment & Return Requirements

### 7.1 Assignment
The system shall:
- Record the employee or department assigned to each asset
- Track the assignment start date
- Track the current assignment and historical assignment records
- Prevent duplicate active assignments for the same hardware asset

### 7.2 Transfer
The system shall:
- Support reassignment to another user or department
- Record the reason for transfer
- Require appropriate approval when required by policy
- Maintain full historical tracking of the transfer event

### 7.3 Return
The system shall:
- Support return processing for assets being checked back in
- Validate that the asset is eligible for return
- Record return date and receiving user
- Update status to returned or available for reassignment

### 7.4 Missing or Overdue Asset Handling
The system shall:
- Identify assets not returned by due date or not located as expected
- Flag assets as missing, overdue, or under investigation
- Support escalation workflow for lost or unreturned hardware
- Produce management exceptions for follow-up

## 8. Warranty Management Requirements

The system shall:
- Record warranty type, start date, and end date
- Link warranty to the asset and vendor
- Display current warranty status
- Notify administrators when warranty expiry is approaching
- Record claims or warranty service activity if applicable
- Report warranty exposure and expiring coverage by asset or department

## 9. Maintenance Requirements

The system shall:
- Record maintenance events for each asset
- Include service date, issue description, technician or vendor, and resolution
- Track whether maintenance is planned or completed
- Flag assets due for preventive maintenance
- Associate maintenance with operational impact and cost when relevant

## 10. Software License Management

### 10.1 License Tracking
The system shall:
- Track software titles, vendors, license types, expiration dates, and seats
- Record entitlements and license counts
- Support assignment of licenses to users, devices, or departments
- Highlight licensing risks such as over-allocation or under-use

### 10.2 Compliance Monitoring
The system shall:
- Compare entitlements against assigned usage
- Identify unapproved or unauthorized software
- Flag expired or near-expired licenses
- Support audit review of software inventory and license compliance

### 10.3 Software Change History
The system shall:
- Maintain a complete history of software acquisition, assignment, and removal
- Record who made the change and when it occurred

## 11. Reporting Requirements

The system shall support reporting for:
- Full asset inventory by category, department, owner, and location
- Asset age and lifecycle status
- Missing, lost, or overdue assets
- Warranty expiry and service deadlines
- Software license utilization and compliance
- Procurement and spend by department or vendor
- Refresh planning and end-of-life forecasts
- Maintenance trends and service history

Reports must:
- Be filterable by department, site, category, owner, and date range
- Support management review and operational follow-up
- Be exportable in standard report formats where applicable

## 12. Security Requirements

The system shall:
- Enforce server-side authorization for every protected operation
- Support role-based access controls
- Prevent unauthorized modification of asset records
- Restrict access to sensitive employee or procurement data
- Validate all external input before processing
- Use secure configuration for environment variables and secrets
- Avoid hardcoded credentials or secrets in source code
- Protect API endpoints and sensitive actions with proper authorization checks

Additional security requirements:
- Only authorized users may create, delete, or modify assets
- Privileged operations must require elevated access
- Access to audit or compliance data must be restricted appropriately

## 13. Audit Requirements

The system shall maintain an audit trail for all important operations, including:
- Asset creation
- Updates to asset metadata
- Assignment changes
- Transfer actions
- Return actions
- Disposal actions
- Warranty updates
- Maintenance actions
- Software license changes
- Security role or permission changes
- Approval decisions and exceptions

Audit logs shall include:
- Actor identity
- Action performed
- Date and time
- Affected asset or resource
- Previous and/or new value where applicable
- Reason or approval record, if available

Audit records must be retained for internal and external review and support compliance obligations.

## 14. Approval Requirements

### 14.1 Approval Workflow
The system shall support approval requirements for:
- New asset requests
- High-value asset assignments
- Asset transfers
- Asset disposal or write-off
- Software license purchases above threshold
- Exceptions for lost, damaged, or overdue assets

### 14.2 Approval Rules
The system shall:
- Route requests to the correct approver based on role, department, or asset type
- Support approval and rejection actions
- Record approval decisions and timestamps
- Prevent unauthorized bypass of approval workflow

### 14.3 Escalation
The system shall:
- Escalate overdue approvals to the responsible manager or administrator
- Support follow-up on unresolved approval tasks

## 15. Business Rules

The system shall enforce the following business rules:

1. Every asset must have a unique identifier.
2. Every asset must have a current status and lifecycle stage.
3. An asset cannot have more than one active assignment at a time.
4. Assets marked lost, damaged, or overdue require exception handling.
5. Disposals must be recorded, approved, and retained in audit history.
6. Warranty records must be maintained for all covered assets.
7. Maintenance records must be associated with the correct asset.
8. Software licenses must be tracked and reconciled against approved entitlements.
9. High-value or sensitive assets may require additional approval.
10. All state-changing actions must be auditable.
11. Users must only access records allowed by their role and permission scope.
12. Invalid or incomplete external input must be rejected before processing.
13. No business logic may live in controllers or routes.
14. Infrastructure details must not leak into domain logic.

## 16. MVP Scope

The minimum viable product shall include:

- Centralized asset register
- Asset ownership and assignment tracking
- Asset lifecycle status tracking
- Warranty tracking
- Maintenance tracking
- Software license tracking
- Basic approval workflow for key asset actions
- Search and filtering across assets
- Basic inventory and utilization reporting
- Audit trail for important operational events
- Role-based access control
- CSV import/export capability for asset records
- Validation for incoming data
- Controlled data entry and update processes

This MVP addresses the company’s immediate pain points without overbuilding the solution.

## 17. Out of Scope

The following items are out of scope for the initial implementation unless required later:
- AI-based asset optimization
- Advanced predictive maintenance or predictive lifecycle analytics
- Full ERP integration at initial release
- Mobile barcode or QR scanning
- Complex field inventory workflows
- Full contract lifecycle management beyond core asset, warranty, and licensing support
- Advanced analytics beyond general dashboard and reporting needs
- Deep integration with every business system at launch

## 18. Constraints and Assumptions

- The solution must align with the layered architecture defined in CLAUDE.md.
- Domain logic must remain independent of Express, Knex, and PostgreSQL.
- The application must use server-side authorization instead of client-side enforcement alone.
- Important business actions must generate audit records.
- The system should be implementable in a phased manner, beginning with core asset operations and expanding over time.

## 19. Acceptance Summary

The initiative will be considered successful when the system provides:
- Centralized asset visibility
- Reliable ownership and assignment tracking
- Improved lifecycle management
- Better software compliance control
- More consistent maintenance and warranty monitoring
- Stronger audit readiness
- Improved management reporting and decision support
- Reduced reliance on spreadsheets and manual records

This requirements document is the baseline for the project and should be used to guide design, implementation, testing, and documentation updates.