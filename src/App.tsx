import { type FormEvent, useState } from 'react'
import flowerImg from './assets/flower.png'
import './App.css'

type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  text: string
}

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isOpeningChat, setIsOpeningChat] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = prompt.trim()
    if (!text || isThinking) return

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text,
    }

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setPrompt('')
    setError('')
    setIsThinking(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      const data = (await response.json()) as { text?: string; error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'The agent could not respond.')
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: data.text || 'I could not generate a response for that.',
        },
      ])
    } catch (requestError) {
      console.error(requestError)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The agent could not respond. Please try again.',
      )
    } finally {
      setIsThinking(false)
    }
  }

  function openChat() {
    setIsOpeningChat(true)
    window.setTimeout(() => {
      setIsChatOpen(true)
      setIsOpeningChat(false)
    }, 750)
  }

  if (!isChatOpen) {
    return (
      <main className="flower-screen">
        {isOpeningChat ? (
          <div className="opening-loader" aria-label="Opening chat">
            <span></span>
          </div>
        ) : (
          <div className="flower-launch">
            <button
              className="flower-button"
              type="button"
              aria-label="Open chat"
              onClick={openChat}
            >
              <img src={flowerImg} alt="" />
            </button>
            <span>blinkAI</span>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="chat-screen">
      <section className="chat-composer" aria-label="Chat">
        <h1>What are you working on?</h1>

        {messages.length > 0 && (
          <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                {message.text}
              </article>
            ))}
            {isThinking && <article className="message assistant">Thinking...</article>}
          </div>
        )}

        <form className="prompt-bar" onSubmit={handleSubmit}>
          <button className="icon-button add-button" type="button" aria-label="Add">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <input
            aria-label="Ask anything"
            placeholder="Ask anything"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <button className="icon-button mic-button" type="button" aria-label="Voice">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
              <path d="M19 11a7 7 0 0 1-14 0" />
              <path d="M12 18v3" />
              <path d="M8 21h8" />
            </svg>
          </button>

          <button
            className="voice-button"
            type="submit"
            aria-label={isThinking ? 'Waiting for Gemini' : 'Send message'}
            disabled={isThinking}
          >
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </form>

        {error && <p className="chat-error">{error}</p>}

        <div className="quick-actions" aria-label="Quick actions">
          <button type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.8" />
              <path d="m5 17 4.6-4.6 3.4 3.4 2-2L19 18" />
            </svg>
            Create an image
          </button>

          <button type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4 16.8-.1 3.3 3.3-.1L18.6 8.6 15.4 5.4 4 16.8Z" />
              <path d="m14.2 6.6 3.2 3.2" />
            </svg>
            Write or edit
          </button>

          <button type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3a14 14 0 0 1 0 18" />
              <path d="M12 3a14 14 0 0 0 0 18" />
            </svg>
            Look something up
          </button>
        </div>
      </section>
    </main>
  )
}

export default App
