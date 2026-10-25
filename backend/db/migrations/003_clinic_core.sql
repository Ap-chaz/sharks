CREATE TABLE departments (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB;

CREATE TABLE services (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_services_name (name),
  CONSTRAINT fk_services_department FOREIGN KEY (department_id) REFERENCES departments (id)
) ENGINE=InnoDB;

CREATE TABLE doctors (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  full_name VARCHAR(120) NOT NULL,
  department_id SMALLINT UNSIGNED NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_doctors_user (user_id),
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_doctors_department FOREIGN KEY (department_id) REFERENCES departments (id)
) ENGINE=InnoDB;

CREATE TABLE patients (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  date_of_birth DATE NULL,
  gender ENUM('female','male','other') NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(190) NULL,
  address VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_patients_name (full_name),
  KEY ix_patients_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NULL,
  doctor_id SMALLINT UNSIGNED NOT NULL,
  service_id SMALLINT UNSIGNED NULL,
  starts_at DATETIME NOT NULL,
  status ENUM('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
  requester_name VARCHAR(120) NULL,
  requester_phone VARCHAR(30) NULL,
  notes VARCHAR(500) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  active_slot DATETIME GENERATED ALWAYS AS (
    CASE WHEN status IN ('cancelled','no_show') THEN NULL ELSE starts_at END
  ) STORED,
  UNIQUE KEY uq_appointments_slot (doctor_id, active_slot),
  KEY ix_appointments_patient (patient_id),
  KEY ix_appointments_starts (starts_at),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id),
  CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) REFERENCES services (id),
  CONSTRAINT fk_appointments_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO doctors (user_id, full_name, is_default)
SELECT id, full_name, 1 FROM users WHERE username = 'drnyameino';

INSERT INTO doctors (full_name, is_default) VALUES ('Assistant Doctor', 0);
