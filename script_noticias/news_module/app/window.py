from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import load_settings


def get_window(now: datetime | None = None, hours: int | None = None) -> tuple[datetime, datetime]:
    settings = load_settings()
    tz = ZoneInfo(settings.timezone)
    if hours is None:
        hours = settings.window_hours
    if now is None:
        fim = datetime.now(tz)
    else:
        if now.tzinfo is None or now.tzinfo.utcoffset(now) is None:
            raise ValueError("now deve ser timezone-aware")
        fim = now.astimezone(tz)
    inicio = fim - timedelta(hours=hours)
    return inicio, fim
