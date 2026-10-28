CREATE TABLE prescriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  appointment_id INT UNSIGNED NULL,
  notes VARCHAR(500) NULL,
  status ENUM('active','cancelled') NOT NULL DEFAULT 'active',
  prescribed_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_prescriptions_patient (patient_id),
  KEY ix_prescriptions_appointment (appointment_id),
  CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_prescriptions_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id),
  CONSTRAINT fk_prescriptions_prescriber FOREIGN KEY (prescribed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE prescription_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT UNSIGNED NOT NULL,
  medication VARCHAR(120) NOT NULL,
  dosage VARCHAR(80) NOT NULL,
  frequency VARCHAR(80) NOT NULL,
  duration VARCHAR(80) NOT NULL,
  instructions VARCHAR(255) NULL,
  KEY ix_prescription_items_prescription (prescription_id),
  CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions (id)
) ENGINE=InnoDB;
