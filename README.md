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

- **Cadastrar** competições, equipes, corredores e esteiras;
- **Registrar** o início, os checkpoints e o encerramento de cada turno na esteira;
- **Registrar checkpoints** a cada 5 minutos, criando um histórico granular e rastreável de cada corrida;
- **Acompanhar** a quilometragem acumulada por equipe em um dashboard de métricas em tempo real;
- **Visualizar** as métricas totais ao final das 24 horas de competição;
- **Exportar** os resultados em CSV, destinado à auditoria final do evento.

O sistema conta com dois perfis de acesso: o **auditor**, responsável pelo registro em tempo real das corridas em campo, e o **gerente** (Field Marketing), que configura o evento e acompanha o desempenho geral. A autenticação e a autorização por perfil são feitas via JWT, garantindo segurança no acesso às informações.

Tecnicamente, o backend é construído em **Node.js + TypeScript** com **Express 5**, seguindo uma arquitetura em camadas (Controller, Service, Repository) e persistindo os dados em **PostgreSQL** hospedado no **Supabase**. O frontend é renderizado no servidor com **EJS**, complementado por CSS e JavaScript estáticos. A primeira versão funcional do backend já está implementada e testada, com 38 endpoints cobrindo 10 fluxos de negócio e suíte de testes de integração em Jest e Supertest.

O RedRun substitui um processo frágil e manual por um sistema rastreável e confiável, reduzindo erros operacionais e garantindo maior integridade nos resultados da competição.

## 📁 Estrutura de pastas

```
├── documentos/                                    # Documentação geral do projeto
│   ├── assets/                                    # Recursos utilizados na documentação
│   │   ├── classes_dominio/                       # Diagrama de classes de domínio
│   │   ├── diagrama_entidade_relacionamento/      # Diagrama entidade-relacionamento
│   │   ├── diagrama_sequencia/                    # Diagramas de sequência por módulo
│   │   ├── diagramas_arquitetura/                 # Diagramas de arquitetura em Mermaid e SVG
│   │   ├── diagramas_arquiteturais/               # Diagramas de classes por módulo
│   │   ├── guia-de-estilos/                       # Paleta de cores, tipografia e iconografia
│   │   ├── modelo_entidade_relacionamento/        # MER do banco de dados
│   │   ├── negocios/                              # Análises de negócio (Porter, SWOT, Canvas)
│   │   ├── personas/                              # Personas do projeto
│   │   ├── prototipos-alta-fidelidade/            # Protótipos de tela em SVG (fluxos auditor e gerente)
│   │   ├── relatorio_desenvolvimento/             # Capturas de tela do protótipo em desenvolvimento
│   │   ├── testes/                                # Evidências dos testes executados
│   │   ├── use_case/                              # Diagrama de casos de uso
│   │   └── wireframes/                            # Wireframes de baixa e média fidelidade
│   ├── outros/                                    # Documentos complementares
│   │   ├── migrations-schema.md                   # Histórico e descrição das migrações
│   │   ├── regras_de_negocio.md                   # Regras de negócio do sistema
│   │   ├── requisitos_funcionais.md               # Requisitos funcionais levantados
│   │   ├── requisitos_nao_funcionais.md           # Requisitos não funcionais levantados
│   │   └── user_stories.md                        # User stories do projeto
│   └── wad.md                                     # Web Application Document principal do projeto
├── docs/                                          # Documentação publicada da WebAPI
│   └── api/                                       # Página estática da API (servida em /docs)
├── src/                                           # Código-fonte da aplicação
│   ├── controllers/                               # Controladores HTTP (requisição/resposta)
│   ├── database/                                  # Configuração e migrações do banco de dados
│   │   └── migrations/                            # Scripts SQL de migração incremental
│   ├── Front-End/                                 # Frontend renderizado no servidor
│   │   ├── assets/                                # Imagens e ícones da interface
│   │   ├── css/                                   # Folhas de estilo das páginas
│   │   ├── js/                                    # Scripts client-side das páginas
│   │   └── views/                                 # Templates EJS (e HTML legado) das páginas
│   ├── middlewares/                               # Middlewares (autenticação/autorização JWT)
│   ├── repositories/                              # Camada de acesso ao banco (SQL parametrizado)
│   ├── routes/                                    # Definição das rotas da API e das páginas
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

- [Node.js](https://nodejs.org/) versão 18 ou superior
- Conta no [Supabase](https://supabase.com/) (banco de dados PostgreSQL hospedado)
- Editor de código de sua preferência (recomendado: VS Code)

### Instalação

1. Clone o repositório:

```sh
git clone https://git.inteli.edu.br/graduacao/2026-1b/t27/g02.git
cd g02
```

2. Instale as dependências do projeto:

```sh
npm install
```

3. Copie o arquivo de exemplo de variáveis de ambiente e preencha com os seus dados:

```sh
cp .env.example .env
```

Edite o arquivo `.env` com as credenciais do seu projeto Supabase e defina os segredos JWT:

```env
# Banco de Dados (Supabase)
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
DATABASE_KEY=SUA_CHAVE_AQUI
DATABASE_PORT=6543
DATABASE_USER=postgres.SEU_PROJECT_REF
DATABASE_NAME=postgres

# Servidor
SERVER_PORT=3000

# Autenticação (JWT)
JWT_ACCESS_SECRET=troque-por-um-segredo-forte
JWT_REFRESH_SECRET=troque-por-outro-segredo-forte
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

4. Execute as migrações do banco de dados:

```sh
npm run migrate
```

5. Inicie o servidor em modo de desenvolvimento:

```sh
npm run dev
```

6. Acesse a aplicação em [http://localhost:3000](http://localhost:3000). Você será redirecionado para a tela de login em [http://localhost:3000/login](http://localhost:3000/login).

### Logins de teste

Ao abrir a aplicação, a primeira tela é a de login. Para explorar o sistema sem precisar cadastrar usuários, utilize uma das três contas de teste já disponíveis no banco. As contas de **auditor** acessam os fluxos de registro em campo, e a de **manager** (gerente) acessa, além disso, a configuração de eventos e o acompanhamento geral.

| Perfil | E-mail | Senha |
|---|---|---|
| Auditor 1 | `auditor1@test.com` | `senha123` |
| Auditor 2 | `auditor2@test.com` | `senha123` |
| Manager 1 | `manager1@test.com` | `senha123` |

> As credenciais acima são exclusivas para teste/demonstração. Não as utilize em ambiente de produção.

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor com hot-reload (ts-node-dev) |
| `npm run build` | Compila o TypeScript para JavaScript |
| `npm start` | Inicia o servidor a partir da build compilada |
| `npm test` | Executa os testes automatizados (Jest) |
| `npm run migrate` | Executa as migrações do banco de dados |

## 🗃 Histórico de lançamentos

* 0.4.0 - 12/06/2026
    * 
* 0.3.0 - 29/05/2026
    * 
* 0.2.0 - 15/05/2026
    * 
* 0.1.0 - 01/05/2026
    *

## 📋 Licença/License

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a href="https://git.inteli.edu.br/graduacao/2026-1b/t27/g02">RedRun</a> © 2026 by <a href="https://git.inteli.edu.br/graduacao/2026-1b/t27/g02">Inteli, Fernanda Helena Bezerra, Gabriel Simões Marques, Giovanna Scharlau Carettoni, Laura Faria Damasceno, Miguel Vinícius da Silva, Nicoly Mendes Adesanmi, Pietro Sansão Lucas</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International</a>
