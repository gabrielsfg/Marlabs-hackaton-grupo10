import argparse
import sys
from datetime import datetime

from app.pipeline import run


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingestao diaria de noticias e eventos")
    parser.add_argument("--now", help="Horario de referencia em ISO 8601")
    parser.add_argument("--window-hours", type=int, default=24)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-llm", action="store_true")
    args = parser.parse_args()
    now = datetime.fromisoformat(args.now) if args.now else None
    return run(now=now, window_hours=args.window_hours, dry_run=args.dry_run, skip_llm=args.skip_llm)


if __name__ == "__main__":
    sys.exit(main())
