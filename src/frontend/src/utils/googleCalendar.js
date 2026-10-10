const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

const pad = (n) => String(n).padStart(2, '0')

// YYYY-MM-DD no horario local. Nao usar toISOString(): ele converte para UTC e, depois das 21h em Brasilia, ja e "amanha"
export function formatarDataLocal(data) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
}

export function hojeLocalISO() {
  return formatarDataLocal(new Date())
}

function proximaOcorrencia(diaMes) {
  const [dia, mes] = diaMes.split('/').map(Number)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const candidata = new Date(hoje.getFullYear(), mes - 1, dia)
  // Compara com a meia-noite de hoje: uma data que cai hoje continua sendo hoje, e nao vai para o ano que vem
  if (candidata < hoje) candidata.setFullYear(hoje.getFullYear() + 1)
  return formatarDataLocal(candidata)
}

// No Google, o end.date de um evento de dia inteiro e exclusivo: o evento de um dia termina no dia seguinte
function diaSeguinte(dataISO) {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return formatarDataLocal(new Date(ano, mes - 1, dia + 1))
}

function descricao(clienteNome) {
  return clienteNome
    ? `Cliente: ${clienteNome}\n\nAdicionado pela Central do Assessor.`
    : 'Adicionado pela Central do Assessor.'
}

async function criarEvento(accessToken, evento) {
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

// Datas do cliente (aniversarios etc.): evento de dia inteiro que se repete todo ano
export function criarEventoAnualCalendario(accessToken, { titulo, diaMes, clienteNome }) {
  const dataISO = proximaOcorrencia(diaMes)
  return criarEvento(accessToken, {
    summary: titulo,
    description: descricao(clienteNome),
    start: { date: dataISO },
    end: { date: diaSeguinte(dataISO) },
    recurrence: ['RRULE:FREQ=YEARLY'],
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 1440 }],
    },
  })
}

// Lembretes do assessor: evento de dia inteiro na data escolhida (sem horario)
export function criarEventoCalendario(accessToken, { titulo, data, clienteNome }) {
  return criarEvento(accessToken, {
    summary: titulo,
    description: descricao(clienteNome),
    start: { date: data },
    end: { date: diaSeguinte(data) },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 30 }],
    },
  })
}
