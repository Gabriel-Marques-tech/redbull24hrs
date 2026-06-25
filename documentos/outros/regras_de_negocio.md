# Regras de Negócio — Red Bull 24 Horas

Regras de negócio são declarações que definem ou restringem aspectos do funcionamento do sistema, refletindo políticas, condições e obrigações do domínio. São implementáveis e testáveis, servindo como referencial técnico para o desenvolvimento e validação da aplicação.

---

**RN01** — Um corredor só pode iniciar um turno se não possuir outro turno com status "em andamento" em nenhuma das esteiras do evento.
- RF associado: RF007

**RN02** — A esteira selecionada deve estar com status "Livre" para que um novo turno possa ser iniciado. Esteiras "Ocupadas" não podem receber novo turno.
- RF associado: RF007

**RN03** — O modal de checkpoint obrigatório deve ser disparado exatamente a cada 300 segundos (5 minutos) a partir do timestamp de início do turno. Nenhuma outra ação pode ser executada até que o auditor confirme o valor informado.
- RF associado: RF008

**RN04** — A quilometragem informada em um checkpoint voluntário deve ser maior ou igual à quilometragem do checkpoint imediatamente anterior registrado no mesmo turno (ou à km_inicial, se for o primeiro checkpoint).
- RF associado: RF017

**RN05** — Um turno só pode ser finalizado se possuir ao menos um checkpoint registrado (obrigatório ou voluntário) após o início. Turnos sem nenhum checkpoint não podem ser encerrados.
- RF associado: RF009

**RN06** — A quilometragem final informada deve ser maior ou igual à quilometragem do último checkpoint registrado no turno. Valores menores devem ser rejeitados antes de qualquer persistência.
- RF associado: RF010

**RN07** — Ao finalizar um turno, o sistema deve calcular automaticamente: distância = km_final − km_inicial; duração = timestamp_fim − timestamp_início (em minutos); velocidade_média = distância / (duração / 60). Os três valores devem ser persistidos vinculados ao turno antes de retornar sucesso ao cliente.
- RF associado: RF011

**RN08** — O hot swap só pode ser acionado imediatamente após a finalização de um turno na esteira adjacente. O próximo corredor deve pertencer à mesma equipe já configurada. Não é permitido hot swap (troca de competidores em tempo real) sem turno anterior finalizado, ou com esteira em status ocupado.
- RF associado: RF018

**RN09** — A quilometragem total de uma equipe é a soma dos valores de distância (km_final − km_inicial) de todos os turnos com status "finalizado". Turnos em andamento, cancelados ou inconsistentes não entram no cálculo.
- RF associado: RF012

**RN10** — Snapshots de distância acumulada por hora devem ser gerados automaticamente ao completar cada hora cheia desde o início do evento (t+60min, t+120min, etc.). Snapshots já gerados são imutáveis e não podem ser recalculados retroativamente.
- RF associado: RF019

**RN11** — O dashboard deve ser atualizado em intervalos máximos de 10 segundos. Em caso de falha de conexão, o painel deve exibir indicador visual de "dados desatualizados" com timestamp da última atualização bem-sucedida — nunca exibir dados em branco.
- RF associado: RF013

**RN12** — Uma esteira é "Ocupada" enquanto houver turno com status "em andamento" vinculado a ela, e passa para "Livre" imediatamente após o encerramento. O sistema deve sugerir revezamento quando uma esteira acumular 45 minutos contínuos de uso no mesmo turno.
- RF associado: RF020

**RN13** — O histórico deve listar todos os eventos em ordem decrescente de timestamp. Eventos com o mesmo timestamp devem obedecer a seguinte prioridade de exibição: encerramento > checkpoint > início.
- RF associado: RF014

**RN14** — No modo TV nenhuma ação de escrita pode ser executada — a interface é estritamente somente leitura. O acesso ao modo TV não requer autenticação. Qualquer tentativa de POST/PUT/DELETE originada do modo TV deve ser bloqueada no servidor.
- RF associado: RF021

**RN15** — O sistema permite o cadastro de exatamente 2 equipes por evento. A tentativa de cadastrar uma terceira equipe deve ser bloqueada com mensagem de erro. Nomes de equipes devem ser únicos dentro do evento.
- RF associado: RF001

**RN16** — Um corredor só pode ser vinculado a uma única equipe por evento. Após o início do primeiro turno do evento, não é permitido adicionar, remover ou transferir corredores entre equipes.
- RF associado: RF002

**RN17** — O sistema deve bloquear o início de qualquer turno enquanto qualquer uma das duas equipes não possuir ao menos um corredor com status "ativo"; não há exigência de número exato de corredores. O bloqueio deve ser verificado a cada tentativa de início de turno, não apenas no cadastro.
- RF associado: RF003

**RN18** — O campo local/região é obrigatório e deve ser preenchido antes do início do primeiro turno. Após o início do evento, o local não pode ser alterado — qualquer tentativa deve ser rejeitada.
- RF associado: RF025

**RN19** — Apenas esteiras com status "Livre" podem ser selecionadas para iniciar um novo turno. Esteiras "Ocupadas" devem aparecer visualmente desabilitadas na interface e não aceitar seleção.
- RF associado: RF004

**RN20** — A equipe selecionada para uma esteira fica associada durante todo o turno em andamento. Não é permitido trocar a equipe de uma esteira enquanto houver turno em andamento nela.
- RF associado: RF005

**RN21** — Apenas corredores com status "ativo" e sem turno em andamento podem ser selecionados. Corredores já em execução em qualquer esteira devem aparecer indisponíveis (desabilitados) na lista de seleção.
- RF associado: RF006

**RN22** — Os filtros de equipe, esteira e corredor podem ser combinados (operação AND). A aplicação de filtros não altera os dados persistidos — apenas restringe a visibilidade dos registros exibidos. Remover filtros deve restaurar a visão completa.
- RF associado: RF022

**RN23** — Toda edição retroativa deve gerar um registro de auditoria imutável com: id do registro alterado, valor anterior, valor novo, timestamp da alteração e id do auditor. O registro de auditoria não pode ser excluído nem modificado por nenhum perfil.
- RF associado: RF015

**RN24** — A edição de quilometragem em um checkpoint só é válida se o novo valor for maior ou igual ao checkpoint imediatamente anterior e menor ou igual ao checkpoint imediatamente posterior do mesmo turno.
- RF associado: RF015

**RN25** — O sistema deve marcar como inconsistente qualquer turno onde: (a) km_final < km_inicial; (b) gap entre checkpoints superior a 10 minutos sem justificativa registrada; (c) corredor com dois turnos simultâneos. Inconsistências devem ser sinalizadas no dashboard sem bloquear a operação em andamento.
- RF associado: RF023

**RN26** — O CSV exportado deve conter duas seções: (1) turnos — corredor, equipe, esteira, km_inicial, km_final, duracao_min, timestamp_inicio, timestamp_fim; (2) checkpoints — turno_id, km, timestamp, tipo. O nome do arquivo deve seguir o padrão `evento_{local}_{data-ISO}.csv`.
- RF associado: RF024

**RN27** — Em caso de ausência de conexão, os registros devem ser persistidos localmente com o timestamp original do momento do registro. Ao restabelecer conexão, a sincronização deve ocorrer automaticamente sem duplicar registros, preservando a ordem cronológica original.
- RF associado: RF016
