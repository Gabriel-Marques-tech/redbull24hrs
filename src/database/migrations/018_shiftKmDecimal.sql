-- Migration 018: converte km_start, km_end e speed em shifts para NUMERIC(8,2)
-- km_start e km_end eram INT, impedindo registro de km decimal (ex: 10.50)
-- speed também convertido pois velocidade pode ser fracionária

ALTER TABLE shifts
    ALTER COLUMN km_start TYPE NUMERIC(8,2) USING km_start::NUMERIC(8,2);

ALTER TABLE shifts
    ALTER COLUMN km_end TYPE NUMERIC(8,2) USING km_end::NUMERIC(8,2);

ALTER TABLE shifts
    ALTER COLUMN speed TYPE NUMERIC(8,2) USING speed::NUMERIC(8,2);
