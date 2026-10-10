# Ingestao de noticias e eventos corporativos

Modulo de coleta diaria do RSS do InfoMoney e dos eventos IPE da CVM, com resumo gerado por LLM.

## Requisitos

- Python 3.11 ou superior
- Chave de API do provedor LLM escolhido

## Instalacao

Linux/macOS:

```bash
cd script_noticias
python3 -m venv .venv
source .venv/bin/activate
cd news_module
python -m pip install -r requirements.txt
cp .env.example .env
```

Windows PowerShell:

```powershell
cd script_noticias
py -m venv .venv
.\.venv\Scripts\Activate.ps1
cd news_module
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Preencha `LLM_API_KEY` no `.env` com a chave da Groq. O arquivo `.env` nao deve ser versionado. O MVP usa a
Groq e o modelo `openai/gpt-oss-20b` por padrao.

## Execucao manual

A partir de `script_noticias/news_module`:

```bash
python -m app.run_daily --dry-run
python -m app.run_daily --skip-llm
python -m app.run_daily
```

Se o ambiente virtual nao estiver ativado, execute diretamente com o Python correto:

```bash
../.venv/bin/python -m app.run_daily --dry-run
```

Para confirmar o interpretador ativo:

```bash
which python3
```

O caminho deve conter `script_noticias/.venv/bin`.

`--dry-run` e `--skip-llm` coletam os dados e gravam o payload sem chamar o LLM nem alterar o state store.
Para reproduzir uma janela específica, use `--now` com um ISO 8601 timezone-aware:

```bash
python -m app.run_daily --now 2026-06-15T09:00:00-03:00 --window-hours 24 --dry-run
```

## Variaveis de ambiente

As variaveis disponiveis e seus valores padrao estao em `.env.example`:

| Variavel | Descricao |
| --- | --- |
| `TIMEZONE` | Fuso da ingestao, padrao `America/Sao_Paulo` |
| `WINDOW_HOURS` | Tamanho da janela, padrao `24` |
| `INFOMONEY_FEEDS` | URLs RSS separadas por virgula |
| `CVM_CATEGORIAS` | Categorias CVM separadas por virgula |
| `HTTP_TIMEOUT` | Timeout HTTP em segundos |
| `HTTP_RETRIES` | Quantidade de retries HTTP |
| `USER_AGENT` | Identificacao enviada as fontes |
| `FETCH_PDF_TEXT` | Habilita extracao de PDFs |
| `PDF_MAX_CHARS` | Limite de texto extraido por PDF |
| `PDF_MAX_BYTES` | Limite de tamanho por PDF |
| `LLM_API_KEY` | Chave da Groq, somente por ambiente |
| `MAX_INPUT_CHARS` | Limite de entrada enviada ao LLM |
| `DATA_DIR` | Diretório de dados, padrao `./data` |

## Saidas e estado

Cada execucao grava em `data/runs/AAAA-MM-DD/`:

- `payload.json`: itens coletados e filtrados.
- `digest.json`: resumo validado pelo schema Pydantic.
- `digest.md`: resumo formatado para leitura.
- `run.log`: log da execucao.

O controle de idempotencia fica em `data/state/seen.db`. Itens so sao marcados como vistos depois que o digest
e gerado com sucesso. Se o LLM falhar, a proxima execucao reprocessa os mesmos itens.

Codigos de saida:

- `0`: sucesso, inclusive quando nao ha novidades.
- `1`: falha total ou falha do LLM.
- `2`: sucesso parcial, quando uma fonte falha mas o resumo e gerado.

## Agendamento com cron

O cron usa o fuso da maquina. Para executar diariamente as 06:00 em Brasilia:

```cron
TZ=America/Sao_Paulo
0 6 * * * cd /caminho/para/script_noticias/news_module && /caminho/para/script_noticias/.venv/bin/python -m app.run_daily >> data/cron.log 2>&1
```

## Agendamento com GitHub Actions

O `schedule` do GitHub Actions usa UTC. 06:00 em Brasilia corresponde a 09:00 UTC:

```yaml
name: Ingestao diaria

on:
  schedule:
    - cron: "0 9 * * *"
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: script_noticias/news_module
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: python -m app.run_daily
        env:
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: news-data
          path: script_noticias/news_module/data
```

Em execucoes do GitHub Actions, persista `data/state/seen.db` e `data/runs` por artefato ou cache para manter a
idempotencia entre execucoes.
