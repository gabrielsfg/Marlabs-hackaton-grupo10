from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from app.window import get_window

SP = ZoneInfo("America/Sao_Paulo")


def test_get_window_usa_now_injetado():
    now = datetime(2026, 6, 15, 12, 0, tzinfo=SP)
    inicio, fim = get_window(now=now, hours=24)
    assert fim == now
    assert inicio == datetime(2026, 6, 14, 12, 0, tzinfo=SP)


def test_get_window_virada_de_dia():
    now = datetime(2026, 3, 2, 1, 30, tzinfo=SP)
    inicio, fim = get_window(now=now, hours=24)
    assert fim == now
    assert inicio == datetime(2026, 3, 1, 1, 30, tzinfo=SP)


def test_get_window_virada_de_mes():
    now = datetime(2026, 3, 1, 10, 0, tzinfo=SP)
    inicio, fim = get_window(now=now, hours=24)
    assert fim == now
    assert inicio == datetime(2026, 2, 28, 10, 0, tzinfo=SP)


def test_get_window_virada_de_ano():
    now = datetime(2026, 1, 1, 8, 0, tzinfo=SP)
    inicio, fim = get_window(now=now, hours=24)
    assert fim == now
    assert inicio == datetime(2025, 12, 31, 8, 0, tzinfo=SP)


def test_get_window_converte_outro_fuso():
    now = datetime(2026, 6, 15, 15, 0, tzinfo=ZoneInfo("UTC"))
    inicio, fim = get_window(now=now, hours=24)
    assert fim == datetime(2026, 6, 15, 12, 0, tzinfo=SP)
    assert inicio == datetime(2026, 6, 14, 12, 0, tzinfo=SP)


def test_get_window_rejeita_now_naive():
    with pytest.raises(ValueError):
        get_window(now=datetime(2026, 6, 15, 12, 0), hours=24)
