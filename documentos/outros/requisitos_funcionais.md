# Requisitos Funcionais — Red Bull 24 Horas

Requisitos Funcionais (RF) descrevem todas as tarefas, ações e serviços que o sistema deve realizar. Representam o "o quê" o sistema faz: desde o clique de um botão pelo usuário até cálculos automáticos e geração de relatórios.

---

## Prioridade Alta

**RF001** — O sistema deve permitir o cadastro de exatamente duas equipes (por evento) com nome e identificador únicos, impedindo duplicatas.

**RF002** — O sistema deve permitir o cadastro de corredores vinculados a uma única equipe das duas existentes por evento.

**RF003** — O sistema não deve exigir um número exato de corredores por equipe; o início do evento é permitido independentemente da quantidade cadastrada, bastando que cada equipe possua ao menos um corredor ativo.

**RF004** — O sistema deve permitir a seleção da esteira onde o corredor iniciará a atividade.

**RF005** — O sistema deve permitir a seleção da equipe associada à esteira escolhida.

**RF006** — O sistema deve permitir a seleção do corredor da equipe para iniciar a corrida.

**RF007** — O sistema deve permitir que o Auditor registre o início de um turno, armazenando corredor, esteira, quilometragem inicial (km ≥ 0) e timestamp automático do servidor, somente se o corredor não possuir turno em aberto e a esteira estiver com status "Livre".

**RF008** — O sistema deve exibir um modal bloqueante a cada 5 minutos a partir do início do turno, impedindo interação até inserção da quilometragem atual (valor ≥ último checkpoint).

**RF009** — O sistema deve permitir que o Auditor finalize o turno de um corredor, disparando o fluxo de encerramento e cálculo de estatísticas.

**RF010** — O sistema deve permitir a inserção da quilometragem final, registrando timestamp automático e rejeitando valores menores que o último checkpoint.

**RF011** — O sistema deve calcular automaticamente distância (km_final − km_inicial), duração (timestamp_fim − timestamp_início) e velocidade média (km/h), persistindo os dados vinculados ao turno.

**RF012** — O sistema deve calcular automaticamente a quilometragem total acumulada por equipe somando o desempenho individual dos corredores.

**RF013** — O sistema deve exibir um dashboard com placar e métricas atualizados automaticamente em até 10 segundos sem recarregamento de página.

**RF014** — O sistema deve exibir um histórico (log) de entradas, saídas e checkpoints em ordem decrescente.

**RF015** — O sistema deve permitir edição retroativa de registros com log automático de auditoria sobre quem realizou a alteração.

**RF016** — O sistema deve permitir o registro de checkpoints e turnos sem conexão com a internet, persistindo os dados localmente e sincronizando automaticamente ao restabelecer a conexão, sem duplicidade de registros.

**RF017** — O sistema deve exigir autenticação (login e senha) para os perfis de Administrador e Auditor antes de permitir qualquer alteração nos dados.

**RF018** — O sistema deve detectar automaticamente inconsistências nos dados inseridos com base no histórico do corredor, equipe e esteira, gerando alertas em tempo real para o Auditor.

**RF019** — O sistema deve exibir notificações visuais e/ou sonoras ao identificar inconsistências, bloqueando a confirmação do dado até revisão ou justificativa do Auditor.

**RF020** — O sistema deve permitir que o Auditor revise e corrija inconsistências detectadas antes da persistência final dos dados.

---

## Prioridade Média

**RF021** — O sistema deve permitir o registro manual de quilometragem a qualquer momento, gerando timestamp automático para rastreabilidade.

**RF022** — O sistema deve permitir iniciar um novo corredor na esteira adjacente com poucos cliques após o término do turno anterior, reutilizando dados da equipe.

**RF023** — O sistema deve gerar métricas por corredor incluindo distância total, média por turno e histórico de evolução por hora com snapshots a cada 60 minutos.

**RF024** — O sistema deve exibir o status das esteiras (Ocupada/Livre) e sugerir alternância para evitar superaquecimento.

**RF025** — O sistema deve disponibilizar modo TV com fonte ≥ 48px, contraste WCAG AA, resolução 1920x1080, operável sem mouse e sem login.

**RF026** — O sistema deve permitir a filtragem do histórico por equipe, esteira ou corredor.

**RF027** — O sistema deve identificar inconsistências como km_final < km_inicial, intervalo de checkpoint > 10 min e corredor com turnos simultâneos.

**RF028** — O sistema deve permitir exportação de dados em CSV contendo turnos e checkpoints registrados.

**RF029** — O sistema deve disponibilizar uma tela de desempenho final por corredor ao término do evento, contendo métricas como distância total, tempo total e velocidade média.

**RF030** — O sistema deve permitir o compartilhamento do desempenho final do corredor por meio de um link gerado automaticamente.

---

## Prioridade Baixa

**RF031** — O sistema deve permitir o registro do local/região da etapa.

**RF032** — O sistema deve permitir que o corredor acesse seu histórico completo de desempenho no evento após sua finalização.
