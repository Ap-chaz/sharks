CREATE TABLE feedback (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NULL,
  rating TINYINT UNSIGNED NOT NULL,
  message VARCHAR(1000) NOT NULL,
  status ENUM('new','reviewed') NOT NULL DEFAULT 'new',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_feedback_status (status),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;
