# UAT-001

## Requirement

FR-001

## Story

STORY-001 - Create Asset

## Scenario

User creates a new IT asset by submitting asset details through the Create Asset API endpoint.

## Test Data

{
  "assetTag": "LAPTOP-001",
  "assetType": "Laptop",
  "category": "IT Equipment",
  "manufacturer": "Dell",
  "model": "Latitude 5440",
  "serialNumber": "SN123456",
  "status": "Available"
}

## Expected Result

- Asset is successfully created.
- HTTP Status Code 201 is returned.
- Response contains success = true.
- Response returns the submitted asset information.

## Actual Result

- Asset successfully created.
- HTTP Status Code 201 returned.
- Success response received.
- Asset data returned correctly.

## Status

PASS ✅