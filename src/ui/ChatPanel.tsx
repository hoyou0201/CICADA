import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { CHAT_TEXT_MAX, isValidChatText, sendChat, useChat } from '../room/chat.ts'
import { useStore } from '../state/store.ts'

const PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: 'var(--space-4)',
  bottom: 'var(--space-4)',
  width: 300,
  maxWidth: 'calc(100% - 380px)',
  fontSize: 'var(--font-size-sm)',
}

// 같은 방 사람들과 하는 채팅. 저장하지 않아서 나가면 사라진다.
export default function ChatPanel() {
  const messages = useChat((s) => s.messages)
  const connection = useStore((s) => s.connection)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (sendChat(text)) setText('')
  }

  return (
    <section className="panel" style={PANEL_STYLE} aria-label="채팅">
      <h2 className="panel-title">채팅</h2>
      {connection === 'offline' && <p className="text-muted">혼자 모드 · 내 화면에서만 보여요</p>}
      <ul ref={listRef} style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 180, overflowY: 'auto' }}>
        {messages.length === 0 && <li className="text-muted">아직 대화가 없어요</li>}
        {messages.map((m) => (
          <li key={m.id} className={m.mine ? undefined : 'text-muted'}>
            <strong>{m.mine ? '나' : m.nickname}</strong> {m.text}
          </li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_TEXT_MAX}
          placeholder="메시지를 입력하세요"
          aria-label="채팅 메시지"
        />
        <button type="submit" className="btn" disabled={!isValidChatText(text)}>
          보내기
        </button>
      </form>
    </section>
  )
}
