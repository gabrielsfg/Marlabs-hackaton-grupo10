# Ingestao de noticias e eventos corporativos

Modulo de coleta diaria (InfoMoney RSS + CVM IPE) e resumo por IA.

## Instalacao

```powershell
cd script_noticias/news_module
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

## Como rodar

A partir de `script_noticias/news_module`:

```powershell
python -m app.run_daily --dry-run
python -m app.run_daily
```

## Saidas

Em `data/runs/AAAA-MM-DD/`: `payload.json`, `digest.json`, `digest.md` e `run.log`.

## Agendamento

A documentar na tarefa T8.
