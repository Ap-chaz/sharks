-- SHARKS Clinic: one-time MySQL 8.4 setup (port 3307).
-- RECORD ONLY. These statements were run by hand at the root prompt.
-- Passwords were typed there and are never stored in this file.
-- Use letters and digits only for passwords (24+ characters).

CREATE DATABASE IF NOT EXISTS sharks_clinic
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Running app: data rights only.
CREATE USER 'sharks_app'@'127.0.0.1' IDENTIFIED BY '<type-password-here>';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON sharks_clinic.* TO 'sharks_app'@'127.0.0.1';

-- Migration runner: data rights plus schema changes.
CREATE USER 'sharks_migrator'@'127.0.0.1' IDENTIFIED BY '<type-password-here>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON sharks_clinic.* TO 'sharks_migrator'@'127.0.0.1';
