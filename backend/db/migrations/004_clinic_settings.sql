CREATE TABLE clinic_settings (
  setting_key VARCHAR(60) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO clinic_settings (setting_key, setting_value) VALUES
  ('opening_hours', JSON_OBJECT(
    'timezone', 'Africa/Nairobi',
    'slotMinutes', 30,
    'days', JSON_OBJECT(
      'sun', JSON_OBJECT('open', '08:00', 'close', '20:00'),
      'mon', JSON_OBJECT('open', '08:00', 'close', '20:00'),
      'tue', JSON_OBJECT('open', '08:00', 'close', '20:00'),
      'wed', JSON_OBJECT('open', '08:00', 'close', '20:00'),
      'thu', JSON_OBJECT('open', '08:00', 'close', '20:00'),
      'fri', JSON_OBJECT('open', '08:00', 'close', '20:00'),
      'sat', NULL
    )
  ));
