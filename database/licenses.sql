-- License inventory (MS365 Standard, Office 2016, Palo Alto, Omada, ...)
-- Uses its own table names (software_licenses, software_license_assignments),
-- so an older table named "licenses" in the database is left untouched.
-- Run once in pgAdmin (Query Tool on IT_Asset_Management, as postgres).
-- Safe to run again: it only creates what is missing.

CREATE TABLE IF NOT EXISTS software_licenses (
  id             SERIAL PRIMARY KEY,
  product        VARCHAR(120) NOT NULL,
  vendor         VARCHAR(120),
  license_type   VARCHAR(40)  NOT NULL DEFAULT 'Subscription',
  total_seats    INTEGER      NOT NULL DEFAULT 1 CHECK (total_seats >= 0),
  purchase_date  DATE,
  expiry_date    DATE,
  cost           NUMERIC(12,2),
  reference      VARCHAR(120),   -- PO / invoice number
  notes          TEXT,           -- do NOT store license keys here
  created_by     VARCHAR(255),
  updated_by     VARCHAR(255),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMP       -- soft delete (for the Recycle Bin later)
);

CREATE TABLE IF NOT EXISTS software_license_assignments (
  id             SERIAL PRIMARY KEY,
  license_id     INTEGER      NOT NULL REFERENCES software_licenses(id),
  assignee_name  VARCHAR(160) NOT NULL,
  department     VARCHAR(120),
  asset_tag      VARCHAR(50),
  assigned_by    VARCHAR(255),
  assigned_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at    TIMESTAMP,
  released_by    VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_software_license_assignments_license
  ON software_license_assignments (license_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON software_licenses, software_license_assignments TO itasset_user;
GRANT USAGE, SELECT ON SEQUENCE software_licenses_id_seq, software_license_assignments_id_seq TO itasset_user;