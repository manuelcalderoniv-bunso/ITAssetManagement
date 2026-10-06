CREATE DATABASE IF NOT EXISTS itam;
USE itam;

CREATE TABLE assets (
  assetTag VARCHAR(50) PRIMARY KEY,
  assetType VARCHAR(100) NOT NULL,
  status ENUM('Available','Issued','Maintenance','Retired') DEFAULT 'Available'
);

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeName VARCHAR(150) NOT NULL
);

CREATE TABLE assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assetTag VARCHAR(50) NOT NULL,
  employeeId INT NOT NULL,
  assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assetTag) REFERENCES assets(assetTag),
  FOREIGN KEY (employeeId) REFERENCES employees(id)
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(50),
  detail VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO assets VALUES
  ('LAPTOP-500','Laptop','Issued'),
  ('MONITOR-01','Monitor','Available'),
  ('PRINTER-07','Printer','Maintenance');

INSERT INTO employees (employeeName) VALUES
  ('Juan Dela Cruz'), ('Maria Santos'), ('Ana Reyes'), ('Jose Lim'), ('Liza Cruz');

INSERT INTO assignments (assetTag, employeeId) VALUES ('LAPTOP-500', 1);
