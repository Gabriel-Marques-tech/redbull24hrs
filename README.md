# Inteli - Instituto de Tecnologia e Liderança 

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="/assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0"></a>
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

- **Cadastrar** locais de competição, equipes e corredores;
- **Registrar** o início e o encerramento de cada turno na esteira;
- **Acompanhar** a quilometragem acumulada durante a competição;
- **Visualizar** métricas totais ao final das 24 horas de competição;
- **Exportar** os resultados para planilha, destinada à auditoria final do evento.

O sistema conta com dois perfis de acesso: o **auditor**, responsável pelo registro em tempo real das corridas, e o **gerente**, que acompanha o desempenho geral e configura o evento. A autenticação é feita via JWT, garantindo segurança no acesso às informações.

O RedRun substitui um processo frágil e manual por um sistema rastreável e confiável, reduzindo erros operacionais e garantindo maior integridade nos resultados da competição.

## 📝 Link de demonstração

_Coloque aqui o link para o vídeo de demonstração do projeto_

## 📁 Estrutura de pastas

```
├── documentos/                                    # Documentação geral do projeto
│   ├── assets/                                    # Recursos utilizados na documentação
│   │   ├── classes_dominio/                       # Diagrama de classes de domínio
│   │   ├── diagramas_arquitetura/                 # Diagramas de arquitetura em Mermaid e SVG
│   │   ├── diagramas_arquiteturais/               # Diagramas de classes por módulo
│   │   ├── diagrama_sequencia/                    # Diagramas de sequência por módulo
│   │   ├── guia-de-estilos/                       # Paleta de cores, tipografia e iconografia
│   │   ├── modelo_entidade_relacionamento/        # MER do banco de dados
│   │   ├── negocios/                              # Análises de negócio (Porter, SWOT, Canvas)
│   │   ├── personas/                              # Personas do projeto
│   │   ├── prototipos-alta-fidelidade/            # Protótipos de tela em SVG (fluxos auditor e gerente)
│   │   ├── relatorio_desenvolvimento/             # Capturas de tela do protótipo em desenvolvimento
│   │   ├── use_case/                              # Diagrama de casos de uso
│   │   └── wireframes/                            # Wireframes de baixa e média fidelidade
│   ├── outros/                                    # Documentos complementares
│   │   ├── regras_de_negocio.md                   # Regras de negócio do sistema
│   │   ├── requisitos_funcionais.md               # Requisitos funcionais levantados
│   │   ├── requisitos_nao_funcionais.md           # Requisitos não funcionais levantados
│   │   └── user_stories.md                        # User stories do projeto
│   └── wad.md                                     # Web Application Document principal do projeto
├── src/                                           # Código-fonte da aplicação
│   ├── controllers/                               # Controladores HTTP da aplicação
│   ├── database/                                  # Configuração e migrações do banco de dados
│   │   └── migrations/                            # Scripts SQL de migração incremental
│   ├── Front-End/                                 # Recursos estáticos do front-end
│   │   ├── assets/                                # Imagens e ícones da interface
│   │   ├── css/                                   # Folhas de estilo das páginas
│   │   └── pages/                                 # Páginas HTML da aplicação
│   ├── middlewares/                               # Middlewares da aplicação (autenticação JWT)
│   ├── repositories/                              # Camada de acesso ao banco de dados
│   ├── routes/                                    # Definição das rotas da API REST
│   ├── services/                                  # Lógica de negócio da aplicação
│   ├── types/                                     # Tipos e interfaces TypeScript
│   ├── utils/                                     # Funções utilitárias
│   ├── __tests__/                                 # Testes automatizados (Jest)
│   ├── app.ts                                     # Configuração do servidor Express
│   └── index.ts                                   # Ponto de entrada da aplicação
├── assets/                                        # Recursos estáticos gerais
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
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
JWT_ACCESS_SECRET=troque-por-um-segredo-forte
JWT_REFRESH_SECRET=troque-por-outro-segredo-forte
```

4. Execute as migrações do banco de dados:

```sh
npm run migrate
```

5. Inicie o servidor em modo de desenvolvimento:

```sh
npm run dev
```

6. Acesse a aplicação em [http://localhost:3000](http://localhost:3000).

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor com hot-reload (ts-node-dev) |
| `npm run build` | Compila o TypeScript para JavaScript |
| `npm start` | Inicia o servidor a partir da build compilada |
| `npm test` | Executa os testes automatizados (Jest) |
| `npm run migrate` | Executa as migrações do banco de dados |

## 🗃 Histórico de lançamentos

* 0.5.0 - XX/XX/2024
    * 
* 0.4.0 - XX/XX/2024
    * 
* 0.3.0 - XX/XX/2024
    * 
* 0.2.0 - XX/XX/2024
    * 
* 0.1.0 - XX/XX/2024
    *

## 📋 Licença/License

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a href="https://git.inteli.edu.br/graduacao/2026-1b/t27/g02">RedRun</a> © 2026 by <a href="https://git.inteli.edu.br/graduacao/2026-1b/t27/g02">Inteli, Fernanda Helena Bezerra, Gabriel Simões Marques, Giovanna Scharlau Carettoni, Laura Faria Damasceno, Miguel Vinícius da Silva, Nicoly Mendes Adesanmi, Pietro Sansão Lucas</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International</a>
