import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatPrice } from '../lib/format'

const SESSION_KEY = 'shopwave_chat_session'
const HISTORY_KEY = 'shopwave_chat_history'

const QUICK_REPLIES = [
  { label: 'Track my order', text: "Could you help me check the status of my most recent order?" },
  { label: 'Recommend something', text: "I'd love a few personal recommendations based on what I've been looking at." },
  { label: 'Shipping & returns', text: "What are your shipping and return policies?" },
  { label: 'Payment options', text: "Which payment methods do you accept?" },
  { label: 'Gift ideas', text: "I'm shopping for a gift — could you suggest a few good picks?" },
  { label: 'Coupon help', text: "Do you have any active discount codes I can use?" },
]

// Inline SVG icons (no emojis anywhere)
const Icon = {
  Bot: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <path d="M9 17h6" />
    </svg>
  ),
  Send: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Close: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  ArrowRight: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Mic: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  MicOff: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  Volume: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  VolumeMute: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ),
}

// ---------------- Voice helpers ----------------
function getRecognition() {
  if (typeof window === 'undefined') return null
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const rec = new SR()
  rec.continuous = false
  rec.interimResults = true
  rec.lang = 'en-US'
  return rec
}

function pickFemaleVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || []
  // Prefer English female voices that sound natural
  const prefs = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Moira', 'Tessa', 'Victoria', 'Allison']
  for (const name of prefs) {
    const v = voices.find((vv) => vv.name.includes(name))
    if (v) return v
  }
  return voices.find((v) => /en[-_](US|GB|AU|CA)/i.test(v.lang) && /female|woman|samantha|aria|jenny/i.test(v.name)) ||
    voices.find((v) => /en[-_](US|GB)/i.test(v.lang)) ||
    voices[0]
}

function stripMarkupForSpeech(text) {
  return text
    .replace(/\[([^\]]+)\]\(#\d+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[`_~]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim()
}

function speak(text, onEnd) {
  try {
    const synth = window.speechSynthesis
    if (!synth) { onEnd?.(); return null }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(stripMarkupForSpeech(text))
    const v = pickFemaleVoice()
    if (v) u.voice = v
    u.rate = 1.02
    u.pitch = 1.0
    u.volume = 1
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    synth.speak(u)
    return u
  } catch {
    onEnd?.()
    return null
  }
}

function renderMarkdownLite(text) {
  // [name](#id) -> ProductLink, **bold**, line breaks
  const parts = []
  const regex = /\[([^\]]+)\]\(#(\d+)\)|\*\*([^*]+)\*\*/g
  let last = 0, m, key = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2]) {
      parts.push(
        <Link key={`l${key++}`} to={`/product/${m[2]}`} className="text-brand-600 font-semibold hover:underline">
          {m[1]}
        </Link>
      )
    } else if (m[3]) {
      parts.push(<strong key={`b${key++}`}>{m[3]}</strong>)
    }
    last = regex.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || null)
  const [unread, setUnread] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('shopwave_voice_on') === '1')
  const [speaking, setSpeaking] = useState(false)
  const [voiceSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !!window.speechSynthesis)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const recRef = useRef(null)
  const autoSendOnFinal = useRef(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
      if (Array.isArray(saved) && saved.length) setMessages(saved)
      else
        setMessages([
          {
            role: 'assistant',
            content:
              "Hi there, I'm Maya from the Shopwave support team. I can help you find a product, check on an order, look up shipping or return info, or sort out a discount code. What can I help with today?",
            time: formatTime(),
          },
        ])
    } catch {
      setMessages([{ role: 'assistant', content: "Hi, I'm Maya. How can I help?", time: formatTime() }])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)))
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (open) {
      setUnread(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Preload voices for SpeechSynthesis
  useEffect(() => {
    if (!window.speechSynthesis) return
    const t = setInterval(() => {
      if (window.speechSynthesis.getVoices().length > 0) clearInterval(t)
    }, 200)
    return () => clearInterval(t)
  }, [])

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  const startListening = () => {
    if (!voiceSupported || listening || loading) return
    stopSpeaking()
    const rec = getRecognition()
    if (!rec) return
    recRef.current = rec
    autoSendOnFinal.current = true
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      setInput((finalText + interim).trim())
    }
    rec.onerror = () => { setListening(false) }
    rec.onend = () => {
      setListening(false)
      const text = (finalText || '').trim()
      if (autoSendOnFinal.current && text) {
        setInput('')
        sendText(text, { voice: true })
      }
    }
    try { rec.start(); setListening(true) } catch { /* already started */ }
  }

  const stopListening = () => {
    autoSendOnFinal.current = false
    try { recRef.current?.stop() } catch { /* */ }
    setListening(false)
  }

  const toggleVoice = () => {
    const next = !voiceEnabled
    setVoiceEnabled(next)
    localStorage.setItem('shopwave_voice_on', next ? '1' : '0')
    if (!next) stopSpeaking()
  }

  const sendText = async (text, opts = {}) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text, time: formatTime() }
    setMessages((m) => [...m, userMsg])
    setLoading(true)
    try {
      const { data } = await api.post('/api/ai/chat', { message: text, session_id: sessionId })
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id)
        localStorage.setItem(SESSION_KEY, data.session_id)
      }
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply, sources: data.sources || [], time: formatTime() },
      ])
      // Speak reply if user came in by voice OR voice mode is toggled on
      if ((opts.voice || voiceEnabled) && data.reply) {
        setSpeaking(true)
        speak(data.reply, () => setSpeaking(false))
      }
      if (!open) setUnread(true)
    } catch (err) {
      const status = err?.response?.status
      const msg =
        status === 503
          ? "Sorry, the support assistant is offline right now. Please email us at support@shopwave.test and we'll get back to you within the hour."
          : "Something went wrong on my end. Could you try sending that again in a moment?"
      setMessages((m) => [...m, { role: 'assistant', content: msg, time: formatTime() }])
    } finally {
      setLoading(false)
    }
  }

  const send = (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    sendText(text)
  }

  const reset = () => {
    if (!confirm('Start a fresh conversation? Your current chat history will be cleared.')) return
    setMessages([
      {
        role: 'assistant',
        content: "Of course — let's start fresh. What can I help you with?",
        time: formatTime(),
      },
    ])
    setSessionId(null)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(HISTORY_KEY)
  }

  return (
    <>
      {/* Floating button — no emoji, just a clean badge with avatar */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 group"
          aria-label="Open support chat"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-brand-500/30 blur-2xl group-hover:bg-brand-500/50 transition" />
            <div className="relative flex items-center gap-3 pl-2 pr-4 py-2 bg-white rounded-2xl shadow-xl border border-slate-200 hover:border-brand-300 transition">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center">
                  <Icon.Bot width="22" height="22" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-800 leading-tight">Need help?</div>
                <div className="text-[11px] text-slate-500">Maya · usually replies instantly</div>
              </div>
              {unread && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  1
                </span>
              )}
            </div>
          </div>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[400px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center">
                  <Icon.Bot width="20" height="20" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-[15px] leading-tight">Maya · Shopwave Support</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online · typically replies in under a minute
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  title={voiceEnabled ? 'Voice replies on' : 'Voice replies off'}
                  className={`w-8 h-8 rounded-lg hover:bg-slate-100 transition flex items-center justify-center ${voiceEnabled ? 'text-brand-600' : 'text-slate-400'}`}
                  aria-label="Toggle voice replies"
                >
                  {voiceEnabled ? <Icon.Volume width="15" height="15" /> : <Icon.VolumeMute width="15" height="15" />}
                </button>
              )}
              <button onClick={reset} title="New conversation" className="w-8 h-8 rounded-lg hover:bg-slate-100 transition text-slate-500 flex items-center justify-center" aria-label="New conversation">
                <Icon.Refresh width="15" height="15" />
              </button>
              <button onClick={() => setOpen(false)} title="Minimize" className="w-8 h-8 rounded-lg hover:bg-slate-100 transition text-slate-500 flex items-center justify-center" aria-label="Minimize chat">
                <Icon.Close width="16" height="16" />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/60">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center mr-2 mt-0.5 shrink-0">
                    <Icon.Bot width="15" height="15" />
                  </div>
                )}
                <div className={`max-w-[78%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-md shadow-sm'
                    }`}
                  >
                    <div>{m.role === 'assistant' ? renderMarkdownLite(m.content) : m.content}</div>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Mentioned products</div>
                        {m.sources.slice(0, 4).map((s) => (
                          <Link
                            key={s.id}
                            to={`/product/${s.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between gap-2 p-2 -mx-1 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-200 transition group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-medium text-slate-800 truncate group-hover:text-brand-700">
                                {s.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {formatPrice(s.price)}
                                {' · '}
                                {s.in_stock === false || s.stock === 0 ? (
                                  <span className="text-red-500">Out of stock</span>
                                ) : (
                                  <span className="text-emerald-600">In stock</span>
                                )}
                              </div>
                            </div>
                            <Icon.ArrowRight width="14" height="14" className="text-brand-500 group-hover:translate-x-0.5 transition" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.time && (
                    <span className={`text-[10px] text-slate-400 mt-1 px-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {m.role === 'assistant' ? 'Maya · ' : ''}{m.time}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center mr-2 mt-0.5">
                  <Icon.Bot width="15" height="15" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && !loading && (
            <div className="px-3 py-2.5 border-t border-slate-100 bg-white">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2 px-1">
                Common questions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => sendText(q.text)}
                    disabled={loading}
                    className="text-[12px] px-3 py-1.5 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 hover:border-brand-300 transition disabled:opacity-50 text-slate-700"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={send} className="p-3 border-t border-slate-200 flex gap-2 bg-white items-center">
            <input
              ref={inputRef}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition"
              placeholder={listening ? 'Listening…' : 'Type a message or tap the mic…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                title={listening ? 'Stop listening' : 'Speak'}
                className={`w-10 h-10 shrink-0 rounded-xl shadow-sm flex items-center justify-center transition ${
                  listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-40`}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              >
                {listening ? <Icon.MicOff width="16" height="16" /> : <Icon.Mic width="16" height="16" />}
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 shrink-0 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-40 disabled:hover:bg-brand-600 flex items-center justify-center transition"
              aria-label="Send"
            >
              <Icon.Send width="16" height="16" />
            </button>
          </form>
          {speaking && (
            <button
              onClick={stopSpeaking}
              className="text-[11px] text-brand-700 hover:underline px-3 pb-1 self-start"
            >
              Stop speaking
            </button>
          )}
          <div className="px-3 pb-2 text-[10px] text-center text-slate-400">
            {voiceSupported
              ? 'Tap the mic to speak — Maya will reply by voice.'
              : 'Voice input not supported in this browser.'}
          </div>
        </div>
      )}
    </>
  )
}
