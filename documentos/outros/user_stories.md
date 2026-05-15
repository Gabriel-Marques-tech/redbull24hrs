# User Stories — Red Bull 24 Horas

As user stories demonstram as funcionalidades da solução a partir da perspectiva do usuário, sem linguagem técnica. O projeto possui duas personas principais: **Lucas Andrade** (operador de evento) e **Bruno Gardesani** (gerente de evento).

---

## US01 — Registrar início de corrida

**Persona:** Lucas Andrade

**User Story:** "Como operador de evento, quero registrar o início de uma corrida por meio da seleção da equipe e da esteira correspondente, para iniciar o acompanhamento dos quilômetros de forma estruturada, substituindo o registro manual em prancheta e reduzindo inconsistências durante a operação do evento."

**Critério de aceite 1 (CR1):** Deve ser possível selecionar a equipe (Equipe A ou Equipe B) e a esteira correspondente (Esteira 1 ou Esteira 2).
- Validação: verificar se as opções são exibidas corretamente e o registro é persistido após recarregamento.
- Teste: Selecionar equipe e esteira e registrar início da corrida; verificar se data/horário são registrados automaticamente; recarregar a aplicação e confirmar persistência.
- Esperado: corrida iniciada com sucesso, dados persistidos e exibidos em ordem cronológica.

**Critério de aceite 2 (CR2):** Não deve ser permitido iniciar nova corrida na mesma esteira sem encerramento da anterior.
- Validação: tentar iniciar corrida duplicada e verificar se o sistema bloqueia a ação com mensagem de erro.
- Teste: Tentar iniciar nova corrida na mesma esteira sem encerrar a anterior.
- Esperado: sistema bloqueia a ação e exibe mensagem de erro clara.

**Critério de aceite 3 (CR3):** O sistema deve apresentar confirmação visual imediata.
- Validação: verificar exibição da confirmação visual.
- Teste: Registrar início e verificar confirmação visual; medir tempo de resposta da ação.
- Esperado: confirmação exibida.

**Critérios INVEST:**
- Independente: pode ser implementada e testada de forma isolada.
- Negociável: layout e fluxo de interação podem ser ajustados.
- Valiosa: substitui o registro manual em prancheta, reduzindo erros humanos.
- Estimável: escopo delimitado (seleção + registro + persistência).
- Pequena: funcionalidade única, de baixa complexidade.
- Testável: validada pelo fluxo completo incluindo verificação de persistência e tentativa de duplicidade.

---

## US02 — Registrar checkpoints de quilômetros

**Persona:** Lucas Andrade

**User Story:** "Como operador de evento, quero registrar checkpoints de quilômetros durante a corrida em andamento, para garantir o acompanhamento contínuo dos dados, reduzir a perda de informações em caso de falhas e substituir as marcações manuais realizadas a cada intervalo."

**Critério de aceite 1 (CR1):** Deve ser possível registrar checkpoint apenas quando houver corrida ativa na esteira, com inserção manual do valor de quilômetros.
- Validação: verificar se o campo de km é habilitado somente com corrida ativa.
- Teste: Com corrida ativa, inserir valor de km e registrar checkpoint; verificar data/horário automáticos e persistência após recarregamento.
- Esperado: checkpoint registrado, vinculado corretamente e persistido.

**Critério de aceite 2 (CR2):** O sistema deve apresentar mensagem de erro caso não exista corrida ativa na esteira.
- Validação: tentar registrar checkpoint sem corrida ativa e verificar mensagem de erro.
- Teste: Tentar registrar checkpoint sem corrida ativa na esteira.
- Esperado: sistema exibe mensagem de erro.

**Critério de aceite 3 (CR3):** Deve ser possível registrar múltiplos checkpoints, exibidos em ordem cronológica no histórico.
- Validação: registrar múltiplos checkpoints e verificar ordenação no histórico.
- Teste: Registrar múltiplos checkpoints na mesma corrida e verificar ordenação cronológica no histórico.
- Esperado: todos os checkpoints listados em ordem cronológica.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada, considerando apenas a existência de uma corrida ativa.
- Negociável: a forma de inserção dos quilômetros e o fluxo de interação podem ser ajustados.
- Valiosa: garante rastreabilidade contínua dos dados, reduzindo riscos de perda de informação.
- Estimável: escopo claro (entrada de km + registro automático + persistência).
- Pequena: funcionalidade específica, com complexidade controlada.
- Testável: validada por meio do registro de múltiplos checkpoints e verificação da persistência e ordenação.

---

## US03 — Registrar fim de corrida

**Persona:** Lucas Andrade

**User Story:** "Como operador de evento, quero registrar o fim de uma corrida em andamento, informando o valor final de quilômetros, para encerrar corretamente o turno do corredor, consolidar os dados da corrida e evitar inconsistências no controle manual realizado anteriormente."

**Critério de aceite 1 (CR1):** Deve ser possível finalizar corrida apenas quando houver corrida ativa, com inserção manual do valor final de km.
- Validação: verificar se o campo de finalização está disponível somente com corrida ativa.
- Teste: Com corrida ativa, inserir valor final de km e finalizar; verificar data/horário automáticos e persistência.
- Esperado: corrida finalizada e dados persistidos corretamente.

**Critério de aceite 2 (CR2):** Após a finalização, a esteira deve ser marcada como disponível para nova corrida.
- Validação: verificar liberação da esteira após encerramento da corrida.
- Teste: Finalizar corrida e tentar iniciar em outra esteira.
- Esperado: esteira disponível e nova corrida pode ser iniciada normalmente.

**Critério de aceite 3 (CR3):** O sistema deve apresentar mensagem de erro caso não exista corrida ativa na esteira.
- Validação: tentar finalizar sem corrida ativa e verificar mensagem de erro.
- Teste: Tentar finalizar corrida sem corrida ativa na esteira.
- Esperado: sistema exibe mensagem de erro.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada, considerando a existência de uma corrida ativa.
- Negociável: a forma de inserção do valor final e o fluxo de finalização podem ser ajustados.
- Valiosa: permite o encerramento correto da corrida, garantindo a integridade dos dados.
- Estimável: escopo claro (entrada de km final + registro automático + atualização de estado).
- Pequena: funcionalidade específica e bem delimitada.
- Testável: validada por meio da finalização de corridas e verificação da persistência, associação e liberação da esteira.

---

## US04 — Visualizar registros de corridas por equipe e esteira

**Persona:** Bruno Gardesani

**User Story:** "Como gerente de evento, quero visualizar os registros de corridas organizados por equipe e esteira, para acompanhar a operação de forma consolidada, validar a consistência dos dados e reduzir a necessidade de conferência manual realizada anteriormente."

**Critério de aceite 1 (CR1):** Deve ser possível visualizar os registros agrupados por equipe (A e B) e por esteira, em ordem cronológica, com o valor de km de cada evento.
- Validação: verificar agrupamento, ordenação e exibição dos valores de km.
- Teste: Acessar a tela de visualização e verificar registros agrupados por equipe e esteira em ordem cronológica.
- Esperado: dados exibidos corretamente agrupados e ordenados.

**Critério de aceite 2 (CR2):** Deve ser possível diferenciar corridas em andamento e finalizadas.
- Validação: confirmar distinção visual entre os status das corridas.
- Teste: Verificar se corridas em andamento e finalizadas são diferenciadas visualmente na tela.
- Esperado: status de cada corrida identificado claramente.

**Critério de aceite 3 (CR3):** A visualização deve ser atualizada automaticamente após novos registros.
- Validação: registrar novo dado e medir tempo de atualização da tela.
- Teste: Registrar novo dado e verificar atualização da tela.
- Esperado: visualização atualizada automaticamente.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada, utilizando dados já registrados no sistema.
- Negociável: o layout da visualização e a forma de agrupamento podem ser ajustados.
- Valiosa: permite acompanhamento consolidado da operação, reduzindo a necessidade de conferência manual.
- Estimável: escopo claro (listagem + agrupamento + atualização).
- Pequena: funcionalidade focada em visualização, com complexidade controlada.
- Testável: validada por meio da comparação entre os dados exibidos e os registros armazenados.

---

## US05 — Consultar histórico completo e exportar dados

**Persona:** Bruno Gardesani

**User Story:** "Como gerente de evento, quero consultar o histórico completo dos registros e exportar os dados da operação, para validar a consistência das informações, realizar auditorias pós-evento e eliminar a dependência de conferências manuais em prancheta."

**Critério de aceite 1 (CR1):** Deve ser possível visualizar todos os registros (início, checkpoints e finalizações) em ordem cronológica, com data, horário e valor de km.
- Validação: verificar exibição completa e ordenação cronológica.
- Teste: Acessar o histórico completo e verificar todos os registros com data, horário e km em ordem cronológica.
- Esperado: todos os registros exibidos corretamente.

**Critério de aceite 2 (CR2):** Deve ser possível filtrar os dados por equipe e por esteira.
- Validação: aplicar filtros e confirmar que apenas os dados solicitados são exibidos.
- Teste: Aplicar filtros por equipe e por esteira e verificar os resultados exibidos.
- Esperado: apenas os dados filtrados são exibidos.

**Critério de aceite 3 (CR3):** Deve ser possível exportar os dados em CSV; o arquivo deve conter todos os registros sem perda.
- Validação: exportar e conferir integridade e completude do arquivo gerado.
- Teste: Exportar os dados e abrir o CSV para verificar integridade e completude.
- Esperado: arquivo gerado com todos os registros sem perda de informação.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada, utilizando os dados já registrados no sistema.
- Negociável: o formato de exportação e os filtros podem ser ajustados conforme necessidade.
- Valiosa: permite auditoria e validação dos dados, garantindo transparência e confiabilidade da operação.
- Estimável: escopo claro (consulta + filtro + exportação).
- Pequena: funcionalidade delimitada, com complexidade moderada e bem definida.
- Testável: validada por meio da exportação e conferência dos dados gerados.

---

## US06 — Visualizar total de quilômetros por equipe

**Persona:** Bruno Gardesani

**User Story:** "Como gerente de evento, quero visualizar o total de quilômetros por equipe de forma consolidada, para acompanhar os dados com clareza e substituir conferências manuais realizadas anteriormente."

**Critério de aceite 1 (CR1):** O sistema deve exibir o total de km acumulados por equipe (A e B), agrupados por esteira e consolidados por equipe.
- Validação: verificar se os totais são calculados e exibidos corretamente sem duplicidade.
- Teste: Acessar a tela de consolidação e verificar os totais de km por equipe e esteira.
- Esperado: totais calculados corretamente e sem duplicidade.

**Critério de aceite 2 (CR2):** A visualização deve ser atualizada automaticamente após novos registros.
- Validação: registrar novo dado e medir tempo de atualização.
- Teste: Registrar novo dado e verificar atualização automática da tela de consolidação.
- Esperado: visualização atualizada.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada, utilizando dados já registrados no sistema.
- Negociável: o formato de exibição pode ser ajustado sem comprometer o objetivo da funcionalidade.
- Valiosa: permite acompanhamento consolidado do desempenho das equipes ao longo do evento.
- Estimável: escopo claro e bem delimitado.
- Pequena: funcionalidade focada em consolidação, com complexidade controlada.
- Testável: validada comparando os totais exibidos com os registros armazenados.

---

## US07 — Registrar nome do atleta no início da corrida

**Persona:** Lucas Andrade

**User Story:** "Como operador de evento, quero registrar o nome do atleta no início da corrida, para permitir rastreabilidade individual e apoiar a premiação de quem percorreu a maior distância."

**Critério de aceite 1 (CR1):** Deve haver campo opcional para inserção do nome ou ID do corredor no início da corrida; se não preenchido, o registro deve ser identificado como "não identificado".
- Validação: registrar início com e sem preenchimento do campo e verificar identificação exibida.
- Teste: Registrar início de corrida sem preencher o nome do atleta.
- Esperado: registro identificado como "não identificado".

**Critério de aceite 2 (CR2):** O nome do atleta deve ser persistido, vinculado aos checkpoints do turno e exibido na tela de acompanhamento; o vínculo deve ser preservado mesmo em turnos com zero quilômetros registrados.
- Validação: verificar vinculação e exibição na tela de acompanhamento.
- Teste: Registrar início com nome do atleta, realizar checkpoints e acessar a tela de acompanhamento.
- Esperado: nome exibido na tela e vinculado a todos os checkpoints do turno, inclusive em sessões com zero km.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada como extensão do registro de início.
- Negociável: o campo pode ser ajustado (nome, ID ou apelido) sem comprometer o objetivo.
- Valiosa: permite rastreabilidade individual e apoia a premiação dos atletas.
- Estimável: adição simples ao fluxo de registro de início, com escopo bem delimitado.
- Pequena: escopo limitado ao campo de identificação e sua persistência.
- Testável: validada verificando vinculação do nome aos registros do turno.

---

## US08 — Sistema funcionar sem conexão com a internet

**Persona:** Lucas Andrade

**User Story:** "Como operador de evento, quero que o sistema funcione mesmo sem conexão com a internet, para evitar perda de dados durante as 24 horas de evento."

**Critério de aceite 1 (CR1):** O sistema deve permitir o registro de dados sem interrupção do fluxo operacional em caso de queda de conexão, com indicador visual de status (online/offline).
- Validação: simular queda de conexão e verificar continuidade do registro e exibição do indicador.
- Teste: Simular queda de conexão e registrar dados normalmente; verificar indicador visual de status offline.
- Esperado: registros realizados sem interrupção e indicador exibido corretamente.

**Critério de aceite 2 (CR2):** Os dados registrados offline devem usar timestamp original do momento do registro e sincronizar automaticamente ao restabelecer a conexão, sem duplicidade.
- Validação: registrar offline, reconectar e verificar sincronização e integridade dos dados.
- Teste: Reconectar à internet após registros offline e verificar sincronização automática dos dados.
- Esperado: todos os dados sincronizados com timestamps originais e sem duplicatas.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada como camada de resiliência do sistema.
- Negociável: a estratégia de sincronização pode ser ajustada sem comprometer o objetivo principal.
- Valiosa: garante continuidade operacional durante as 24 horas de evento, mesmo com instabilidade de rede.
- Estimável: complexidade moderada, envolvendo armazenamento local e lógica de sincronização.
- Pequena: escopo bem definido (registro offline + indicador + sincronização).
- Testável: validada simulando quedas de conexão e verificando integridade dos dados sincronizados.

---

## US09 — Alertas de esteira sem checkpoints por mais de 5 minutos

**Persona:** Lucas Andrade

**User Story:** "Como operador de evento, quero ser alertado quando uma esteira ficar sem checkpoints por mais de 5 minutos, para identificar possíveis falhas técnicas ou atrasos na troca de corredor."

**Critério de aceite 1 (CR1):** O sistema deve monitorar continuamente o tempo desde o último registro por esteira e disparar alerta visual após 5 minutos sem novo registro, indicando especificamente qual equipe e esteira está inativa.
- Validação: aguardar 5 minutos sem registro e verificar exibição e conteúdo do alerta.
- Teste: Com corrida ativa, aguardar 5 minutos sem registrar checkpoint e verificar disparo do alerta visual.
- Esperado: alerta exibido indicando equipe e esteira inativa.

**Critério de aceite 2 (CR2):** O alerta deve ser removido automaticamente após novo registro na esteira correspondente.
- Validação: registrar novo checkpoint e verificar remoção do alerta.
- Teste: Registrar novo checkpoint na esteira alertada e verificar remoção automática do alerta.
- Esperado: alerta removido automaticamente após o registro.

**Critérios INVEST:**
- Independente: pode ser implementada como funcionalidade de monitoramento isolada.
- Negociável: o tempo de inatividade (5 minutos) pode ser ajustado conforme necessidade operacional.
- Valiosa: ajuda a identificar falhas ou atrasos durante o evento em tempo real.
- Estimável: escopo claro envolvendo monitoramento por timer e exibição de alerta.
- Pequena: funcionalidade pontual e bem delimitada.
- Testável: validada simulando inatividade e verificando disparo e remoção do alerta.

---

## US10 — Visualizar desempenho das equipes por intervalos de tempo

**Persona:** Bruno Gardesani

**User Story:** "Como gerente de evento, quero visualizar o desempenho das equipes agrupado por intervalos de tempo, para analisar a consistência dos dados ao longo do evento e apoiar auditorias pós-evento."

**Critério de aceite 1 (CR1):** Os dados devem ser agrupados por intervalo de tempo definido (ex.: hora), exibindo a quilometragem registrada por equipe em cada intervalo, com possibilidade de comparação entre as duas equipes no mesmo eixo temporal.
- Validação: verificar agrupamento e consistência dos dados exibidos.
- Teste: Acessar o relatório de performance e verificar agrupamento por intervalo de tempo com km por equipe.
- Esperado: dados agrupados corretamente e consistentes com os registros totais armazenados.

**Critério de aceite 2 (CR2):** Deve ser possível exportar o relatório em formato estruturado (CSV).
- Validação: exportar o relatório e verificar integridade dos dados gerados.
- Teste: Exportar o relatório em CSV e verificar integridade dos dados.
- Esperado: arquivo gerado com todos os dados e formatação adequada.

**Critérios INVEST:**
- Independente: pode ser implementada de forma isolada, utilizando os dados já registrados no sistema.
- Negociável: o intervalo de tempo e o formato de exportação podem ser ajustados conforme necessidade.
- Valiosa: permite análise de consistência ao longo do evento e apoia auditorias pós-evento.
- Estimável: complexidade moderada, envolvendo agrupamento temporal e exportação.
- Pequena: escopo bem definido (agrupamento + comparação + exportação).
- Testável: validada comparando os dados do relatório com os registros armazenados.
