# Inteli - Instituto de Tecnologia e Liderança 

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="documentos/assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0"></a>
</p>

# RedRun

## Grupo Red Runners

## 🧑‍🎓 Integrantes: 
- <a href="http://www.linkedin.com/in/nandahelena">Fernanda Helena Bezerra </a>
- <a href="https://www.linkedin.com/in/gabrielmarquesinteli">Gabriel Simões Marques</a>
- <a href="https://www.linkedin.com/in/giovannascharlaucarettoni">Giovanna Scharlau Carettoni</a> 
- <a href="http://www.linkedin.com/in/laura-faria-damasceno">Laura Faria Damasceno</a> 
- <a href="http://www.linkedin.com/in/miguelvvinicius">Miguel Viníius da Silva</a>
- <a href="http://www.linkedin.com/in/nicoly-mendes-adesanmi-b260052b2">Nicoly Mendes Adesanmi</a> 
- <a href="https://www.linkedin.com/in/pietrosansao">Pietro Sansão Lucas</a>

## 🧑‍🏫 Professores:
### Orientador(a) 
- <a href="https://www.linkedin.com/in/profclaudioandre/">Claudio Fernando André</a>
### Instrutores
- <a href="https://www.linkedin.com/in/cristiano-benites-ph-d-687647a8/">Cristiano da Silva Benites</a>
- <a href="https://www.linkedin.com/in/camilanarantes/">Camila Naves Arantes</a> 
- <a href="https://www.linkedin.com/in/heloisacandello/">Heloisa Caroline de Souza Pereira Candello</a> 
- <a href="https://www.linkedin.com/in/luciano-galdino-26191b36/">Luciano Galdino</a> 
- <a href="https://www.linkedin.com/in/natalia-k-37a62052/">Natalia Varela da Rocha Kloeckner</a>

## 📝 Descrição

O **RedRun** é uma aplicação web desenvolvida para apoiar a operação do **Red Bull 24 Horas** — grupo de competições anual de corrida em esteira realizadas em diversas cidades do Brasil, na qual duas equipes se revezam continuamente ao longo de 24 horas com o objetivo de acumular o maior número de quilômetros possível.

Antes do RedRun, a apuração dos quilômetros era feita manualmente por auditores utilizando pranchetas físicas — processo suscetível a erros de anotação, distrações e inconsistências que comprometiam a confiabilidade dos resultados. O uso de pulseiras sincronizadas com as esteiras também se mostrou inviável, dada a dinâmica acelerada de trocas de corredores e a ausência de tempo hábil para sincronização prévia.

A plataforma oferece aos auditores e gerentes do evento um sistema digital completo para:

- **Cadastrar** competições, equipes, corredores (com foto) e esteiras;
- **Registrar** o início, os checkpoints e o encerramento de cada turno na esteira;
- **Registrar checkpoints** a cada 5 minutos, criando um histórico granular e rastreável de cada corrida, com leitura automática da quilometragem por **OCR** a partir da foto do display da esteira;
- **Operar offline** em campo, sincronizando os checkpoints sem conexão e mantendo trilha de auditoria das ações;
- **Acompanhar** a quilometragem acumulada por equipe em um dashboard de métricas em tempo real, com **modo TV** público;
- **Visualizar** as métricas totais ao final das 24 horas de competição;
- **Exportar** os resultados em planilha excel personalizavel, destinado à auditoria final do evento.

O sistema conta com dois perfis de acesso: o **auditor**, responsável pelo registro em tempo real das corridas em campo, e o **gerente** (Field Marketing), que configura o evento e acompanha o desempenho geral. A autenticação é feita por **JWT**: a WebAPI valida o access token por header Bearer e as páginas renderizadas no servidor usam autenticação por cookie com rotação de refresh token, com autorização por perfil garantindo segurança no acesso às informações.

Tecnicamente, o backend é construído em **Node.js + TypeScript** com **Express 5**, seguindo uma arquitetura em camadas (Controller, Service, Repository) e persistindo os dados em **PostgreSQL** hospedado no **Supabase**. As fotos de atletas, eventos, turnos e checkpoints são armazenadas no **Supabase Storage**, e a leitura automática da quilometragem usa **OCR** via Google Gemini (com fallback no Groq). O frontend é renderizado no servidor com **EJS**, complementado por CSS e JavaScript estáticos. O backend já está implementado e testado, com 57 endpoints de WebAPI cobrindo 11 fluxos de negócio e suíte de testes de integração em Jest e Supertest.

O RedRun substitui um processo frágil e manual por um sistema rastreável e confiável, reduzindo erros operacionais e garantindo maior integridade nos resultados da competição.

## 📝 Link de demonstração

[Vídeo de demonstração do RedRun](https://youtu.be/A1usFifXgXE)

## 📁 Estrutura de pastas

```
├── documentos/                                    # Documentação geral do projeto
│   ├── assets/                                    # Recursos utilizados na documentação
│   │   ├── business_model_canvas/                 # Business Model Canvas
│   │   ├── classes_dominio/                       # Diagrama de classes de domínio
│   │   ├── diagrama_entidade_relacionamento/      # Diagrama entidade-relacionamento
│   │   ├── diagrama_implantacao/                  # Diagrama de implantação
│   │   ├── diagrama_sequencia/                    # Diagramas de sequência por módulo
│   │   ├── diagramas_arquitetura/                 # Diagramas de arquitetura em Mermaid e SVG
│   │   ├── diagramas_arquiteturais/               # Diagramas de classes por módulo
│   │   ├── guia-de-estilos/                       # Paleta de cores, tipografia e iconografia
│   │   ├── modelo_entidade_relacionamento/        # MER do banco de dados
│   │   ├── negocios/                              # Análises de negócio (Porter, SWOT, Canvas)
│   │   ├── personas/                              # Personas do projeto
│   │   ├── prototipos-alta-fidelidade/            # Protótipos de tela em SVG (fluxos auditor e gerente)
│   │   ├── relatorio_desenvolvimento/             # Capturas de tela do protótipo em desenvolvimento
│   │   ├── teste-sus/                             # Resultados do teste de usabilidade (SUS)
│   │   ├── testes/                                # Evidências dos testes executados
│   │   ├── use_case/                              # Diagrama de casos de uso
│   │   └── wireframes/                            # Wireframes de baixa e média fidelidade
│   ├── outros/                                    # Documentos complementares
│   │   ├── WebAPI/                                # Página estática da WebAPI publicada (servida em /docs)
│   │   ├── migrations-schema.md                   # Histórico e descrição das migrações
│   │   ├── quebra_de_linha.md                     # Notas complementares
│   │   ├── regras_de_negocio.md                   # Regras de negócio do sistema
│   │   ├── requisitos_funcionais.md               # Requisitos funcionais levantados
│   │   ├── requisitos_nao_funcionais.md           # Requisitos não funcionais levantados
│   │   └── user_stories.md                        # User stories do projeto
│   └── wad.md                                     # Web Application Document principal do projeto
├── src/                                           # Código-fonte da aplicação
│   ├── controllers/                               # Controladores HTTP (requisição/resposta)
│   ├── database/                                  # Configuração e migrações do banco de dados
│   │   └── migrations/                            # Scripts SQL de migração incremental
│   ├── Front-End/                                 # Frontend renderizado no servidor
│   │   ├── assets/                                # Imagens e ícones da interface
│   │   ├── css/                                   # Folhas de estilo das páginas
│   │   ├── js/                                    # Scripts client-side das páginas
│   │   └── views/                                 # Templates EJS das páginas
│   │       └── partials/                          # Trechos EJS reutilizáveis (cabeçalho, rodapé etc.)
│   ├── middlewares/                               # Middlewares (autenticação/autorização JWT)
│   ├── repositories/                              # Camada de acesso ao banco (SQL parametrizado)
│   ├── routes/                                    # Definição das rotas da API e das páginas
│   ├── scripts/                                   # Scripts auxiliares (ex.: testes de OCR, e-mails de demo)
│   │   └── supportData/                           # Dados de apoio dos scripts
│   ├── services/                                  # Lógica de negócio da aplicação
│   ├── types/                                     # Tipos e interfaces TypeScript
│   ├── utils/                                     # Funções utilitárias (ex.: emissão de JWT)
│   ├── __tests__/                                 # Testes de integração (Jest + Supertest)
│   ├── app.ts                                     # Configuração do servidor Express
│   └── index.ts                                   # Ponto de entrada da aplicação
├── .env.example                                   # Modelo de variáveis de ambiente
├── .gitlab-ci.yml                                 # Pipeline de CI/CD
├── jest.config.js                                 # Configuração dos testes
├── package.json                                   # Dependências e scripts do projeto
├── tsconfig.json                                  # Configuração do TypeScript
└── README.md                                      # Guia geral do projeto (este arquivo)
```

## 💻 Configuração para desenvolvimento e execução do código

### Pré-requisitos

Antes de começar, garanta que você tem disponível:

- **[Node.js](https://nodejs.org/) 18 ou superior** e o **npm** (instalado junto com o Node). Confirme com `node -v` e `npm -v`.
- **[Git](https://git-scm.com/)** para clonar o repositório.
- **Conta no [Supabase](https://supabase.com/)** com um projeto criado. O Supabase fornece tanto o banco **PostgreSQL** quanto o **Storage** usado para as fotos de atletas, eventos e checkpoints.
- **Chave de API do [Google Gemini](https://aistudio.google.com/app/apikey)** (`GEMINI_API_KEY`), usada pelo OCR que lê a quilometragem na foto da esteira. É o provedor principal de OCR.
- **(Opcional) Chave de API do [Groq](https://console.groq.com/keys)** (`GROQ_API_KEY`), usada como provedor de OCR reserva caso o Gemini fique indisponível. Sem ela, o sistema funciona, mas perde o fallback de OCR.
- Editor de código de sua preferência (recomendado: VS Code).

> As funcionalidades de upload de imagem e OCR dependem do Supabase Storage e da chave do Gemini. O restante da aplicação (cadastros, turnos, checkpoints manuais, métricas, exportação) funciona sem as chaves de OCR, apenas sem a leitura automática da quilometragem.

### 1. Clonar o repositório

```sh
git clone https://git.inteli.edu.br/graduacao/2026-1b/t27/g02.git
cd g02
```

### 2. Instalar as dependências

```sh
npm install
```

### 3. Preparar o projeto Supabase

No painel do seu projeto Supabase:

1. Em **Project Settings → Database**, copie a **connection string** do modo **Transaction pooler** (porta `6543`). Ela tem o formato `postgresql://postgres.SEU_PROJECT_REF:SENHA@HOST:6543/postgres` e será usada em `DATABASE_URL`.
2. Em **Project Settings → API**, copie a **Project URL** (`SUPABASE_URL`) e a chave **`service_role`** (`SUPABASE_SERVICE_ROLE_KEY`). A `service_role` é uma chave administrativa: mantenha-a em segredo e nunca a exponha no frontend.
3. Em **Storage**, crie um **bucket público** chamado **`photos`**. É nele que a aplicação grava, em pastas separadas, as fotos de atletas (`athletes/`), de eventos (`events/`), de turnos (`shifts/`) e de checkpoints (`checkpoints/`).

### 4. Configurar as variáveis de ambiente

Copie o arquivo de exemplo e edite o `.env` com os seus dados:

```sh
cp .env.example .env
```

Preencha cada variável conforme a tabela abaixo:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string do pooler do Supabase (porta `6543`). |
| `DATABASE_KEY` | Sim | Senha do banco de dados (a mesma usada na connection string). |
| `DATABASE_PORT` | Sim | Porta de conexão; use `6543` para o Transaction pooler. |
| `DATABASE_USER` | Sim | Usuário do banco, no formato `postgres.SEU_PROJECT_REF`. |
| `DATABASE_NAME` | Sim | Nome do banco/identificação da aplicação; padrão `postgres`. |
| `SERVER_PORT` | Sim | Porta em que o servidor Express sobe localmente (ex.: `3000`). |
| `SUPABASE_URL` | Sim | Project URL do Supabase (`https://SEU_PROJECT_REF.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave `service_role` do Supabase, usada para upload/remoção no Storage. |
| `JWT_ACCESS_SECRET` | Sim | Segredo para assinar o access token. Use um valor longo e aleatório. |
| `JWT_REFRESH_SECRET` | Sim | Segredo para assinar o refresh token. Diferente do access. |
| `JWT_ACCESS_EXPIRES` | Sim | Validade do access token (ex.: `15m`). |
| `JWT_REFRESH_EXPIRES` | Sim | Validade do refresh token (ex.: `7d`). |
| `GEMINI_API_KEY` | Sim | Chave do Google Gemini, provedor principal do OCR de quilometragem. |
| `GROQ_API_KEY` | Opcional | Chave do Groq, provedor de OCR reserva (fallback). |
| `SMTP_USER` | Opcional | Usuário SMTP (Brevo) para envio de e-mails. |
| `SMTP_PASS` | Opcional | Chave/senha SMTP (Brevo) para envio de e-mails. |
| `EMAIL_FROM` | Opcional | Remetente exibido nos e-mails enviados pela aplicação. |
| `APP_BASE_URL` | Opcional | URL pública base da aplicação, usada em links de compartilhamento. |

> Dica: gere os segredos JWT com valores fortes e aleatórios, por exemplo `openssl rand -hex 32`, e use segredos distintos para access e refresh.

Modelo do arquivo `.env`:

```env
# Banco de Dados (Supabase)
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
DATABASE_KEY=SUA_CHAVE_AQUI
DATABASE_PORT=6543
DATABASE_USER=postgres.SEU_PROJECT_REF
DATABASE_NAME=postgres

# Servidor
SERVER_PORT=3000

# Supabase Storage (upload de imagens)
SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_AQUI

# Autenticação (JWT)
JWT_ACCESS_SECRET=troque-por-um-segredo-forte
JWT_REFRESH_SECRET=troque-por-outro-segredo-forte
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# OCR de checkpoints (leitura de quilometragem por foto)
GEMINI_API_KEY=SUA_GEMINI_API_KEY_AQUI
GROQ_API_KEY=SUA_GROQ_API_KEY_AQUI

# Envio de e-mails (SMTP Brevo)
SMTP_USER=SEU_SMTP_USER_AQUI
SMTP_PASS=SUA_SMTP_KEY_AQUI
EMAIL_FROM=Red Bull 24H <noreply@seudominio.com>

# URL pública da aplicação (links de compartilhamento)
APP_BASE_URL=http://localhost:3000
```

> O arquivo `.env` contém segredos e **não deve ser commitado** (já está no `.gitignore`). Use o `.env.example` como referência versionada.

### 5. Executar as migrações do banco

As migrações criam e atualizam o schema de forma incremental e idempotente; podem ser rodadas com segurança em um banco vazio ou já existente:

```sh
npm run migrate
```

### 6. Iniciar a aplicação

Em desenvolvimento, com hot-reload:

```sh
npm run dev
```

Para um ambiente de produção, compile o TypeScript e rode a build:

```sh
npm run build
npm start
```

### 7. Acessar a aplicação

Abra `http://localhost:3000` no navegador (ajuste a porta se alterou `SERVER_PORT`). Você será redirecionado para a tela de login em `http://localhost:3000/login`.

### Logins de teste

Ao abrir a aplicação, a primeira tela é a de login. Para explorar o sistema sem precisar cadastrar usuários, utilize a conta de desenvolvimento **MasterManager**, criada automaticamente ao final das migrations (`025_ocrFields.sql`). Por ser um perfil de **manager** (gerente), ela acessa tanto os fluxos de registro em campo quanto a configuração de eventos e o acompanhamento geral.

| Perfil | E-mail | Senha |
|---|---|---|
| MasterManager | `master@email.com` | `senha123` |

> A credencial acima é exclusiva para desenvolvimento/demonstração. Não a utilize em ambiente de produção.

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor com hot-reload (ts-node-dev) |
| `npm run build` | Compila o TypeScript para JavaScript |
| `npm start` | Inicia o servidor a partir da build compilada |
| `npm test` | Executa os testes automatizados (Jest) |
| `npm run migrate` | Executa as migrações do banco de dados |

## 🗃 Histórico de lançamentos

* 0.5.0 - 25/06/2026
    * Leitura automática da quilometragem por OCR a partir da foto da esteira, upload e processamento de imagens no Supabase Storage (limite de 5MB) com foto de atleta por evento; modo TV público com polling reduzido (60s → 10s); pausa de competição que bloqueia turnos e checkpoints, com log de auditoria da pausa; pace por turno exibido ao lado da quilometragem no modal de finalização; exportação em planilha filtrada por colunas, telas de estatísticas da competição, diagramas de arquitetura (Mermaid/SVG) e de classes por módulo, e ampliação da cobertura de testes.
* 0.4.0 - 12/06/2026
    * Frontend integrado renderizado no servidor com EJS, autenticação por cookie com rotação de refresh token e proteção das rotas SSR; sincronização offline de checkpoints (dedupe por sync_id), trilha de auditoria e correção retroativa de checkpoints.
* 0.3.0 - 29/05/2026
    * Backend em camadas (Controller, Service, Repository) com CRUD de eventos, equipes, turnos, histórico, métricas, alertas e exportação CSV; suíte de testes de integração (Jest + Supertest) e pipeline de CI/CD com deploy da WebAPI no GitLab Pages.
* 0.2.0 - 15/05/2026
    * Modelagem do sistema: diagramas de classes, de sequência, de casos de uso e entidade-relacionamento (MER); wireframes, protótipos de alta fidelidade e primeira migration do banco de dados.
* 0.1.0 - 01/05/2026
    * Documentação inicial do projeto: WAD, requisitos funcionais e não funcionais, regras de negócio, user stories e análises de negócio (Forças de Porter, SWOT e Business Model Canvas).

## 📋 Licença/License

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><p>RedRun © 2026 by <a href="https://www.inteli.edu.br">Inteli</a>, <a href="http://www.linkedin.com/in/nandahelena">Fernanda Helena Bezerra</a>, <a href="https://www.linkedin.com/in/gabrielmarquesinteli">Gabriel Simões Marques</a>, <a href="https://www.linkedin.com/in/giovannascharlaucarettoni">Giovanna Scharlau Carettoni</a>, <a href="http://www.linkedin.com/in/laura-faria-damasceno">Laura Faria Damasceno</a>, <a href="http://www.linkedin.com/in/miguelvvinicius">Miguel Vinícius da Silva</a>, <a href="http://www.linkedin.com/in/nicoly-mendes-adesanmi-b260052b2">Nicoly Mendes Adesanmi</a>, <a href="https://www.linkedin.com/in/pietrosansao">Pietro Sansão Lucas</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International</a>.</p>
