import { useState } from 'react'
import { ConfirmButton } from './ConfirmButton'
import { addPrep, entries, removePrep, updatePrep, type PrepItem, type Trip } from './data'

type Row = PrepItem & { id: string }

const byCreated = (a: Row, b: Row) => (a.createdAt ?? 0) - (b.createdAt ?? 0)

export function PrepTab({ tripId, trip, me }: { tripId: string; trip: Trip; me: string }) {
  const all = entries(trip.prep).sort(byCreated)
  const shared = all.filter((p) => p.shared)
  const personal = all.filter((p) => !p.shared)
  const mine = personal.filter((p) => p.owner === me)

  // 멤버 목록 + 준비물을 올렸지만 멤버 목록엔 없는 사람까지
  const names = new Set(Object.values(trip.members ?? {}).map((m) => m.name))
  personal.forEach((p) => p.owner && names.add(p.owner))
  names.delete(me)
  const others = [...names].sort((a, b) => a.localeCompare(b, 'ko'))

  const unassigned = shared.filter((s) => !s.owner).length

  return (
    <div className="sections">
      <section className="section">
        <div className="section__head">
          <h2>내 준비물</h2>
          <Count items={mine} />
        </div>
        <p className="hint">내가 따로 챙겨 갈 것. 다른 사람도 볼 수 있어요.</p>
        <ul className="list">
          {mine.map((p) => (
            <PrepRow key={p.id} tripId={tripId} item={p} me={me} canCheck canDelete />
          ))}
        </ul>
        <AddLine
          placeholder="예: 수건, 충전기, 슬리퍼"
          onAdd={(text) => addPrep(tripId, { text, shared: false, owner: me }, me)}
        />
      </section>

      <section className="section">
        <div className="section__head">
          <h2>공용 준비물</h2>
          {unassigned > 0 ? <span className="pill pill--warn">담당자 없음 {unassigned}</span> : <Count items={shared} />}
        </div>
        <p className="hint">한 명만 챙기면 되는 것. "내가 챙길게"를 눌러 담당을 맡아요.</p>
        <ul className="list">
          {shared.map((p) => (
            <SharedRow key={p.id} tripId={tripId} item={p} me={me} />
          ))}
        </ul>
        <AddLine
          placeholder="예: 블루투스 스피커, 보드게임"
          onAdd={(text) => addPrep(tripId, { text, shared: true, owner: null }, me)}
        />
      </section>

      <section className="section">
        <div className="section__head">
          <h2>다른 사람 준비물</h2>
        </div>
        {others.length === 0 ? (
          <p className="empty">아직 들어온 사람이 없어요. 위의 "링크 공유"로 친구들을 불러 주세요.</p>
        ) : (
          <div className="people">
            {others.map((name) => {
              const items = personal.filter((p) => p.owner === name)
              const theirShared = shared.filter((s) => s.owner === name)
              return (
                <details key={name} className="person" open={items.length > 0 && items.length <= 6}>
                  <summary>
                    <span className="avatar">{name.slice(0, 1)}</span>
                    <span className="person__name">{name}</span>
                    {items.length === 0 ? <span className="muted small">아직 안 올렸어요</span> : <Count items={items} />}
                  </summary>
                  {items.length > 0 && (
                    <ul className="list list--compact">
                      {items.map((p) => (
                        <PrepRow key={p.id} tripId={tripId} item={p} me={me} />
                      ))}
                    </ul>
                  )}
                  {theirShared.length > 0 && (
                    <p className="small muted person__shared">공용 담당: {theirShared.map((s) => s.text).join(', ')}</p>
                  )}
                </details>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Count({ items }: { items: { done: boolean }[] }) {
  if (items.length === 0) return null
  const done = items.filter((i) => i.done).length
  return (
    <span className={`pill ${done === items.length ? 'pill--ok' : ''}`}>
      챙김 {done}/{items.length}
    </span>
  )
}

function Check({ checked, onToggle, label, disabled }: { checked: boolean; onToggle?: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      className={`check ${checked ? 'is-on' : ''}`}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </button>
  )
}

function PrepRow({
  tripId,
  item,
  me,
  canCheck,
  canDelete,
}: {
  tripId: string
  item: Row
  me: string
  canCheck?: boolean
  canDelete?: boolean
}) {
  return (
    <li className={`row ${item.done ? 'is-done' : ''}`}>
      <Check
        checked={item.done}
        label={`${item.text} 챙김`}
        disabled={!canCheck}
        onToggle={() => void updatePrep(tripId, item.id, { done: !item.done })}
      />
      <span className="row__text">
        {item.text}
        {item.createdBy && item.createdBy !== item.owner && item.createdBy !== me && (
          <span className="small muted"> · {item.createdBy}가 추가</span>
        )}
      </span>
      {canDelete && (
        <ConfirmButton className="icon-btn" confirmLabel="삭제" onConfirm={() => void removePrep(tripId, item.id)}>
          <span aria-label="삭제">✕</span>
        </ConfirmButton>
      )}
    </li>
  )
}

function SharedRow({ tripId, item, me }: { tripId: string; item: Row; me: string }) {
  const mine = item.owner === me
  return (
    <li className={`row ${item.done ? 'is-done' : ''}`}>
      <Check
        checked={item.done}
        label={`${item.text} 챙김`}
        disabled={!item.owner}
        onToggle={() => void updatePrep(tripId, item.id, { done: !item.done })}
      />
      <span className="row__text">{item.text}</span>
      {item.owner ? (
        mine ? (
          <button
            className="owner owner--me"
            onClick={() => void updatePrep(tripId, item.id, { owner: null, done: false })}
            title="담당 그만두기"
          >
            내가 챙김 ✕
          </button>
        ) : (
          <span className="owner">{item.owner}</span>
        )
      ) : (
        <button className="btn btn--small btn--accent" onClick={() => void updatePrep(tripId, item.id, { owner: me })}>
          내가 챙길게
        </button>
      )}
      <ConfirmButton className="icon-btn" confirmLabel="삭제" onConfirm={() => void removePrep(tripId, item.id)}>
        <span aria-label="삭제">✕</span>
      </ConfirmButton>
    </li>
  )
}

export function AddLine({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => unknown }) {
  const [text, setText] = useState('')
  const submit = () => {
    // 쉼표로 여러 개 한 번에
    const parts = text
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    parts.forEach((p) => onAdd(p))
    setText('')
  }
  return (
    <form
      className="add"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input className="input" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={80} />
      <button className="btn btn--primary" disabled={!text.trim()}>
        추가
      </button>
    </form>
  )
}
