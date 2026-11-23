-- Cloud & Storage monitoring (OneDrive, SharePoint, NAS, backup storage, ...)
-- Run once in pgAdmin (Query Tool on IT_Asset_Management, as postgres).
-- Safe to run again: it only creates what is missing, and the OneDrive
-- starter row is added only while the table is still empty.

CREATE TABLE IF NOT EXISTS storage_services (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  provider    VARCHAR(120),
  category    VARCHAR(20)  NOT NULL DEFAULT 'Cloud' CHECK (category IN ('Cloud', 'On-premise')),
  warn_pct    SMALLINT     NOT NULL DEFAULT 80 CHECK (warn_pct BETWEEN 1 AND 99),
  crit_pct    SMALLINT     NOT NULL DEFAULT 90 CHECK (crit_pct BETWEEN 2 AND 100),
  notes       TEXT,
  created_by  VARCHAR(255),
  updated_by  VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CHECK (warn_pct < crit_pct)
);

-- One row per reading. The current figure is simply the newest reading,
-- so history (growth, forecast) comes for free.
CREATE TABLE IF NOT EXISTS storage_readings (
  id           SERIAL PRIMARY KEY,
  service_id   INTEGER      NOT NULL REFERENCES storage_services(id),
  capacity_tb  NUMERIC(12,2) NOT NULL CHECK (capacity_tb > 0),
  used_tb      NUMERIC(12,2) NOT NULL CHECK (used_tb >= 0),
  recorded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  recorded_by  VARCHAR(255),
  source       VARCHAR(20)  NOT NULL DEFAULT 'manual',   -- 'manual' now; 'api' when a Microsoft Graph sync is added
  note         TEXT
);
CREATE INDEX IF NOT EXISTS idx_storage_readings_service_time
  ON storage_readings (service_id, recorded_at DESC);

-- At most one open alert per service (warning OR critical).
CREATE TABLE IF NOT EXISTS storage_alerts (
  id               SERIAL PRIMARY KEY,
  service_id       INTEGER      NOT NULL REFERENCES storage_services(id),
  level            VARCHAR(10)  NOT NULL CHECK (level IN ('warning', 'critical')),
  usage_pct        NUMERIC(6,2) NOT NULL,
  message          TEXT         NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  VARCHAR(255),
  resolved_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_storage_alerts_open
  ON storage_alerts (service_id) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON storage_services, storage_readings, storage_alerts TO itasset_user;
GRANT USAGE, SELECT ON SEQUENCE storage_services_id_seq, storage_readings_id_seq, storage_alerts_id_seq TO itasset_user;

-- Starter data: the OneDrive figures from the Dashboard spec
-- (285 TB used + 35 TB available = 320 TB, 89%, Warning).
-- Update it from the Cloud & Storage page with the real, current numbers.
DO $$
DECLARE v_id INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage_services) THEN
    INSERT INTO storage_services (name, provider, category, warn_pct, crit_pct, created_by, updated_by)
    VALUES ('OneDrive', 'Microsoft 365', 'Cloud', 80, 90, 'setup', 'setup')
    RETURNING id INTO v_id;

    INSERT INTO storage_readings (service_id, capacity_tb, used_tb, recorded_by, source, note)
    VALUES (v_id, 320, 285, 'setup', 'manual', 'Starter value');

    INSERT INTO storage_alerts (service_id, level, usage_pct, message)
    VALUES (v_id, 'warning', 89.06,
            'OneDrive is at 89% (285 of 320 TB used). Warning threshold: 80%.');
  END IF;
END $$;
