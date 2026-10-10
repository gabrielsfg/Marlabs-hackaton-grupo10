import Groq from 'groq-sdk'

const SCHEMA_DESC = `{
  "nome": "nome completo do cliente (string obrigatória)",
  "email": "email ou null",
  "cpf": "CPF no formato XXX.XXX.XXX-XX ou null",
  "perfil": "Conservador" | "Moderado" | "Arrojado" | null,
  "idade": número inteiro ou null,
  "familiares": [{"nome": "string", "parentesco": "string"}],
  "objetivos": [{"descricao": "string"}],
  "bens": [{"tipo": "Imóvel" | "Veículo" | "Outro", "descricao": "string", "valorEstimado": número ou null}],
  "datas": [{"tipo": "Aniversário" | "Aniversário de casamento" | "Aniversário de familiar" | "Outro", "descricao": "string", "data": "DD/MM"}],
  "insights": ["observação estratégica sobre o cliente"]
}`

export async function extrairDadosTranscricao(textoTranscricao) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('Chave VITE_GROQ_API_KEY não encontrada no .env.local')

  const client = new Groq({ apiKey, dangerouslyAllowBrowser: true })

  const response = await client.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em extrair dados de clientes a partir de transcrições de reuniões entre assessores financeiros e clientes. Sempre retorne um JSON válido seguindo o esquema exato fornecido.

Esquema esperado:
${SCHEMA_DESC}

Regras de inferência:
- Perfil: avesso a risco/preservação de capital = "Conservador"; equilíbrio risco/retorno = "Moderado"; busca de alta rentabilidade/aceita volatilidade = "Arrojado"
- Se uma informação não aparece explicitamente, use null ou array vazio []
- Datas: capture aniversários, aniversários de casamento, aniversários de familiares e datas importantes mencionadas. Formato sempre DD/MM (sem ano)
- Insights: máximo 5 observações estratégicas curtas e objetivas sobre o perfil, necessidades ou oportunidades do cliente`,
      },
      {
        role: 'user',
        content: `Analise a transcrição abaixo e extraia as informações do cliente em JSON:\n\n${textoTranscricao}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('A IA não retornou texto')

  const raw = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('A IA não retornou um JSON válido')
  return JSON.parse(match[0])
}
