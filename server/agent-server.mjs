import 'dotenv/config'
import express from 'express'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { createAgent, tool } from 'langchain'
import { z } from 'zod'

const port = Number(process.env.AGENT_PORT || 8787)
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

function safeCalculate(expression) {
  if (!/^[\d+\-*/().,\s%]+$/.test(expression)) {
    throw new Error('Only numbers and basic arithmetic operators are allowed.')
  }

  const normalizedExpression = expression.replaceAll(',', '')
  const result = Function(`"use strict"; return (${normalizedExpression})`)()

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('The expression did not produce a finite number.')
  }

  return String(result)
}

const calculatorTool = tool(
  ({ expression }) => safeCalculate(expression),
  {
    name: 'calculator',
    description:
      'Evaluate basic arithmetic expressions. Use this for math instead of mental arithmetic.',
    schema: z.object({
      expression: z
        .string()
        .describe('A basic arithmetic expression using numbers and + - * / % ( ).'),
    }),
  },
)

const dateTimeTool = tool(
  ({ timeZone }) => {
    const date = new Date()
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: timeZone || 'Asia/Calcutta',
    }).format(date)
  },
  {
    name: 'current_datetime',
    description:
      'Get the current date and time. Use Asia/Calcutta when the user does not specify a timezone.',
    schema: z.object({
      timeZone: z
        .string()
        .optional()
        .describe('An IANA timezone such as Asia/Calcutta or America/New_York.'),
    }),
  },
)

const plannerTool = tool(
  ({ goal }) => {
    const cleanedGoal = goal.trim()
    return [
      `Goal: ${cleanedGoal}`,
      '1. Clarify the desired outcome.',
      '2. Break it into the smallest useful next actions.',
      '3. Do the first action now and verify the result.',
      '4. Keep the remaining steps visible and adjust as new information appears.',
    ].join('\n')
  },
  {
    name: 'make_brief_plan',
    description:
      'Create a short practical plan for a task, project, coding request, or study goal.',
    schema: z.object({
      goal: z.string().describe('The task or outcome to plan for.'),
    }),
  },
)

const textStatsTool = tool(
  ({ text }) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    return JSON.stringify({
      characters: text.length,
      charactersWithoutSpaces: text.replace(/\s/g, '').length,
      words,
      lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    })
  },
  {
    name: 'text_stats',
    description: 'Count words, characters, and lines in supplied text.',
    schema: z.object({
      text: z.string().describe('The text to inspect.'),
    }),
  },
)

const wikipediaTool = tool(
  async ({ query }) => {
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php')
    searchUrl.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'search',
      srsearch: query,
      srlimit: '1',
      origin: '*',
    }).toString()

    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) {
      throw new Error('Wikipedia search failed.')
    }

    const searchData = await searchResponse.json()
    const result = searchData?.query?.search?.[0]

    if (!result?.title) {
      return `No Wikipedia article found for "${query}".`
    }

    const summaryUrl = new URL(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        result.title,
      )}`,
    )
    const summaryResponse = await fetch(summaryUrl)
    if (!summaryResponse.ok) {
      throw new Error('Wikipedia summary failed.')
    }

    const summaryData = await summaryResponse.json()
    return JSON.stringify({
      title: summaryData.title || result.title,
      summary: summaryData.extract || 'No summary available.',
      url:
        summaryData.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
    })
  },
  {
    name: 'wikipedia_lookup',
    description:
      'Search Wikipedia and return a short encyclopedic summary with a source URL. Use this for factual background on people, places, concepts, history, science, and organizations.',
    schema: z.object({
      query: z.string().describe('The Wikipedia topic or search query.'),
    }),
  },
)

if (!apiKey) {
  console.warn('Missing GEMINI_API_KEY or VITE_GEMINI_API_KEY in .env')
}

const model = new ChatGoogleGenerativeAI({
  apiKey,
  model: 'gemini-2.5-flash',
  temperature: 0.4,
  maxOutputTokens: 900,
  thinkingConfig: {
    thinkingBudget: 0,
  },
})

const agent = createAgent({
  model,
  tools: [
    calculatorTool,
    dateTimeTool,
    plannerTool,
    textStatsTool,
    wikipediaTool,
  ],
  prompt:
    'You are BlinkAI, a concise helpful agent. Use tools when they improve accuracy. Do not mention tool internals unless useful to the user.',
})

function normalizeMessages(messages) {
  return messages
    .filter((message) => message?.text && ['user', 'assistant'].includes(message.role))
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.text),
    }))
}

function getLastAssistantText(result) {
  const lastMessage = [...(result.messages || [])]
    .reverse()
    .find((message) => {
      const role = message.getType?.() || message.role
      return role === 'ai' || role === 'assistant'
    })

  const content = lastMessage?.content

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part?.type === 'text') return part.text
        return ''
      })
      .join('')
      .trim()
  }

  return ''
}

function getAgentErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : String(error)

  if (rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE')) {
    return 'Gemini 2.5 Flash is busy right now. Please try again in a moment.'
  }

  if (rawMessage.includes('API key') || rawMessage.includes('API_KEY')) {
    return 'The Gemini API key was rejected. Check the key and its restrictions.'
  }

  return 'The agent could not respond. Please try again.'
}

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    model: 'gemini-2.5-flash',
    tools: [
      'calculator',
      'current_datetime',
      'make_brief_plan',
      'text_stats',
      'wikipedia_lookup',
    ],
  })
})

app.post('/api/chat', async (request, response) => {
  try {
    const messages = normalizeMessages(request.body?.messages || [])

    if (messages.length === 0) {
      response.status(400).json({ error: 'Send at least one message.' })
      return
    }

    const result = await agent.invoke({ messages })
    const text = getLastAssistantText(result)

    response.json({
      text: text || 'I could not generate a response for that.',
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({
      error: getAgentErrorMessage(error),
    })
  }
})

app.listen(port, () => {
  console.log(`BlinkAI LangChain agent listening on http://127.0.0.1:${port}`)
})
