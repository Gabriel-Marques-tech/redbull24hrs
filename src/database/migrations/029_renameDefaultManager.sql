-- Renomeia o gerente padrao de desenvolvimento para Admin em bancos que ja
-- rodaram a 025 com o nome antigo. Em instalacoes novas nao altera nada.
UPDATE managers
SET name = 'Admin', email = 'admin@email.com'
WHERE email = 'master@email.com'
  AND NOT EXISTS (SELECT 1 FROM managers WHERE email = 'admin@email.com');
