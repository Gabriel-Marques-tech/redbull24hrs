# Requisitos Não Funcionais — Red Bull 24 Horas

Enquanto os requisitos funcionais descrevem o que o sistema faz, os Requisitos Não Funcionais (RNF) definem como o sistema deve operar. Não estão ligados a uma funcionalidade específica, mas às características de qualidade e restrições que garantem que o software seja robusto, eficiente e seguro.

A estrutura segue os 8 eixos de qualidade da norma ISO/IEC 25010:

---

## USAB — Usabilidade

**Contexto:** O evento pode ocorrer em ambientes outdoor ou indoor, com condições de luminosidade variável. Auditores operam tablets em ritmo acelerado, com trocas de corredor de no máximo 1 minuto — essa é a janela disponível para encerrar o turno anterior e iniciar o próximo sem lacunas no registro.

**RFs relacionados:** RF004, RF005, RF006, RF007, RF008, RF009, RF010, RF018

**Requisito:** O sistema deve ser otimizado para operação em dispositivos móveis (iPad/Tablets) em ambiente de alta luminosidade e ritmo acelerado, permitindo execução rápida das funções básicas (início, checkpoint e fim).

**Métrica / Critério:** O tempo de operação do fluxo principal (início → checkpoint → fim) por um auditor não deve exceder 5 minutos; elementos interativos devem possuir área mínima de 44x44 pixels.

**Como atendido:** Interface de alto contraste, uso de teclados numéricos nativos do iOS/Android para inputs e design touch-friendly.

---

## CONF — Confiabilidade

**Contexto:** O evento pode contar com disponibilidade de internet no local, mas o sistema deve funcionar com ou sem ela, pois adversidades climáticas e operacionais podem interrompê-la a qualquer momento durante as 24 horas. Uma perda de dados invalida a apuração oficial e inviabiliza a definição da equipe vencedora.

**RFs relacionados:** RF016

**Requisito:** O sistema deve garantir a integridade dos dados mesmo em caso de interrupção de conectividade ou queda de energia.

**Métrica / Critério:** Disponibilidade (uptime) ≥ 99,9% durante as 24h do evento; perda máxima de dados (RPO) ≤ 5 minutos.

**Como atendido:** Implementação de persistência local (LocalStorage ou IndexedDB), mantendo os dados no navegador até confirmação de sincronização com o backend Node.js.

---

## DES — Desempenho

**Contexto:** A troca de corredor exige que a esteira pare; nesse intervalo, de no máximo 1 minuto, o Auditor precisa encerrar o turno anterior e registrar o início do próximo. Lentidão no salvamento pode gerar lacunas no histórico ou contabilização incorreta de quilometragem.

**RFs relacionados:** RF007, RF008, RF009, RF010, RF013

**Requisito:** O sistema deve responder de forma quase instantânea para não impactar o revezamento dos atletas.

**Métrica / Critério:** Tempo de resposta das requisições de salvamento (p95) < 200ms; carregamento inicial do dashboard < 2 segundos em rede 4G.

**Como atendido:** Otimização de queries no banco de dados, uso de cache para o dashboard e backend leve em Node.js/Express.

---

## SUP — Suportabilidade

**Contexto:** O sistema será mantido e evoluído por equipes futuras sem relação com o time de desenvolvimento original. Para que novas features e correções sejam implementadas com segurança e sem regressão, a arquitetura deve seguir padrões reconhecidos de organização e documentação de código.

**RFs relacionados:** RF007, RF008, RF010, RF011

**Requisito:** O sistema deve ser de fácil manutenção e permitir correções rápidas sem interrupção da cronometragem.

**Métrica / Critério:** Cobertura de testes unitários ≥ 70% nas rotinas de cálculo; documentação de API disponível via Swagger/OpenAPI.

**Como atendido:** Arquitetura modular em TypeScript e separação clara entre lógica de cálculo de quilometragem e rotas de interface.

---

## SEG — Segurança

**Contexto:** Os dados de quilometragem não são pessoalmente sensíveis, mas sua divulgação antes do encerramento oficial comprometeria o suspense do vencedor, elemento central da experiência do evento Red Bull 24 Horas. O acesso ao placar em tempo real deve ser controlado para preservar a integridade competitiva até o anúncio oficial.

**RFs relacionados:** RF015, RF023

**Requisito:** O sistema deve proteger contra manipulação acidental de dados e garantir rastreabilidade e autoria das alterações.

**Métrica / Critério:** Todo registro de edição retroativa deve gerar log contendo valor original, novo valor, timestamp e IP do dispositivo.

**Como atendido:** Implementação de logs de auditoria no backend e sanitização de inputs para prevenção de SQL Injection e XSS.

---

## CAP — Capacidade

**Contexto:** O evento possui cerca de 2 operadores por etapa, com até 5 etapas regionais podendo ocorrer simultaneamente, somadas às telas de placar em modo TV acessadas sem login. O sistema deve suportar no mínimo 10 conexões simultâneas, com margem de segurança projetada para 20.

**RFs relacionados:** RF013, RF021

**Requisito:** O sistema deve suportar o volume de dados gerados pelas esteiras simultâneas e múltiplos acessos ao dashboard durante o evento.

**Métrica / Critério:** Suporte a até 20 conexões simultâneas (auditores + telas de placar) sem degradação perceptível de performance.

**Como atendido:** Dimensionamento adequado da instância Node.js e uso de WebSockets (quando necessário) para atualização eficiente do dashboard.

---

## REST — Restrições de Design

**Contexto:** O local do evento pode ter infraestrutura disponível, mas condições climáticas e adversidades tornam sua garantia incerta. A independência de APIs externas e hardware proprietário das esteiras reduz o risco operacional e garante que o sistema funcione em qualquer cenário de campo.

**RFs relacionados:** RF007, RF008, RF009, RF010, RF011, RF016

**Requisito:** O sistema deve operar de forma independente, respeitando a infraestrutura limitada de eventos presenciais.

**Métrica / Critério:** Não deve haver dependência de APIs externas de terceiros nem de hardware específico das esteiras.

**Como atendido:** Todo processamento de quilometragem realizado internamente e uso de bibliotecas locais (self-hosted).

---

## ORG — Organizacionais

**Contexto:** O sistema é entregue alinhado ao calendário do evento Red Bull 24 Horas. A interface integra a identidade visual da Red Bull, tornando-se parte dos sistemas oficiais da marca durante a realização das etapas, com tablets e telas de placar representando a marca em tempo real para a organização e participantes.

**RFs relacionados:** RF021, RF024, RF025

**Requisito:** O sistema deve estar em conformidade com o cronograma e identidade visual da Red Bull.

**Métrica / Critério:** Interface deve seguir o guia de estilos oficial; entrega da versão estável com antecedência para simulação.

**Como atendido:** Uso de paleta de cores e tipografia oficiais no CSS e validação contínua com stakeholders.
