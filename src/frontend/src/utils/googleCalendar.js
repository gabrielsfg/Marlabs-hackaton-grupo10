const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

function proximaOcorrencia(diaMes) {
  const [dia, mes] = diaMes.split('/').map(Number)
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const candidata = new Date(ano, mes - 1, dia)
  if (candidata < hoje) candidata.setFullYear(ano + 1)
  return candidata.toISOString().slice(0, 10)
}

export async function criarEventoAnualCalendario(accessToken, { titulo, diaMes, clienteNome }) {
  const dataISO = proximaOcorrencia(diaMes)
  const evento = {
    summary: titulo,
    description: clienteNome
      ? `Cliente: ${clienteNome}\n\nAdicionado pela Central do Assessor.`
      : 'Adicionado pela Central do Assessor.',
    start: { date: dataISO },
    end: { date: dataISO },
    recurrence: ['RRULE:FREQ=YEARLY'],
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 1440 }],
    },
  }

  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(evento),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao criar evento no Google Agenda')
  }

  return res.json()
}

export async function criarEventoCalendario(accessToken, { titulo, data, clienteNome }) {
  const evento = {
    summary: titulo,
    description: clienteNome
      ? `Cliente: ${clienteNome}\n\nAdicionado pela Central do Assessor.`
      : 'Adicionado pela Central do Assessor.',
    start: { date: data },
    end: { date: data },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 30 }],
    },
  }

  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(evento),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao criar evento no Google Agenda')
  }

  return res.json()
}
