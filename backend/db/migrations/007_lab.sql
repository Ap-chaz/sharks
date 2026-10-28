CREATE TABLE lab_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  appointment_id INT UNSIGNED NULL,
  test_name VARCHAR(120) NOT NULL,
  notes VARCHAR(500) NULL,
  status ENUM('requested','in_progress','completed','cancelled') NOT NULL DEFAULT 'requested',
  requested_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_lab_requests_patient (patient_id),
  KEY ix_lab_requests_appointment (appointment_id),
  KEY ix_lab_requests_status (status),
  CONSTRAINT fk_lab_requests_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_lab_requests_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id),
  CONSTRAINT fk_lab_requests_requester FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE lab_results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNSIGNED NOT NULL,
  result_text VARCHAR(2000) NOT NULL,
  unit VARCHAR(30) NULL,
  reference_range VARCHAR(80) NULL,
  entered_by INT UNSIGNED NULL,
  entered_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lab_results_request (request_id),
  CONSTRAINT fk_lab_results_request FOREIGN KEY (request_id) REFERENCES lab_requests (id),
  CONSTRAINT fk_lab_results_enterer FOREIGN KEY (entered_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;
