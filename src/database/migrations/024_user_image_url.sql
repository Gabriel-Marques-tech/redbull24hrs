ALTER TABLE managers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE auditors ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE SEQUENCE IF NOT EXISTS auditor_reg_num_seq START 1000 INCREMENT 1;
SELECT setval('auditor_reg_num_seq', GREATEST((SELECT COALESCE(MAX(registration_number), 999) FROM auditors), 999));
ALTER TABLE auditors ALTER COLUMN registration_number SET DEFAULT nextval('auditor_reg_num_seq');
