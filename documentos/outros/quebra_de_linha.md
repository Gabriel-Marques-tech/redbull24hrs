## Boas Práticas

### Quando aplicar este fluxo

Sempre que ocorrer um **conflito estranho** ao tentar abrir/atualizar um PR, como por exemplo:

- Seções de arquivos `.md` aparecendo como alteradas sem que tenham sido modificadas
- Quebras de linha suspeitas no diff
- Diff mostrando o arquivo inteiro como modificado
  Siga o fluxo abaixo antes de abrir/atualizar o PR:

### Fluxo de correção

```bash
# 1. Renormaliza todos os arquivos conforme regras do .gitattributes
git add --renormalize .

# 2. Verifica o que será commitado
#    Deve retornar informações do documento todo "alterado" (apenas line endings)
git diff --cached

# 3. Verifica se as únicas mudanças são realmente quebras de linha
#    Não deve retornar nada (-w ignora diferenças de whitespace)
git diff --cached -w

# 4. Realiza o commit com mensagem descritiva
git commit -m "fix: normaliza quebras de linha conforme .gitattributes"

# 5. Envia para a branch de destino
git push origin <branch-de-destino>
```

> ⚠️ Se o passo **3** (`git diff --cached -w`) retornar conteúdo, **pare**: existem alterações reais misturadas. Faça o commit da normalização separado das alterações de conteúdo para manter o histórico limpo.

---

### Configuração para evitar problemas futuros

Cada membro do time deve configurar o Git **uma única vez** na sua máquina, de acordo com o sistema operacional, para que o padrão de quebra de linha seja tratado automaticamente:

**Windows:**

```bash
git config --global core.autocrlf true
```

**MacOS / Linux:**

```bash
git config --global core.autocrlf input
```

#### O que cada configuração faz

| Configuração          | Ao fazer `checkout`    | Ao fazer `commit`      |
| --------------------- | ---------------------- | ---------------------- |
| `true` (Windows)      | Converte `LF` → `CRLF` | Converte `CRLF` → `LF` |
| `input` (MacOS/Linux) | Mantém `LF`            | Converte `CRLF` → `LF` |

Dessa forma, o repositório mantém **sempre `LF`** internamente, e cada desenvolvedor trabalha com o padrão nativo do seu sistema operacional sem gerar conflitos.

---

## Checklist rápido antes de abrir um PR

- [ ] Configurei `core.autocrlf` corretamente para meu SO
- [ ] Não há diffs estranhos em arquivos que não modifiquei
- [ ] Em caso de diff suspeito, executei o fluxo de `--renormalize`
- [ ] Mensagem de commit é descritiva e segue o padrão do time
