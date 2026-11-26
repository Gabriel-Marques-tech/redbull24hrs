-- migration 028: a competição guarda data E horário.
-- A coluna era DATE, então o horário informado no cadastro era descartado e as
-- telas mostravam sempre 00:00. TIMESTAMP (sem fuso) preserva o horário digitado.
ALTER TABLE events ALTER COLUMN date TYPE TIMESTAMP USING date::timestamp;
