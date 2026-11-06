import { useState } from 'react'
import { ConfirmButton } from './ConfirmButton'
import { addShop, entries, pick, removeShop, updateShop, type ShopItem, type Trip } from './data'

type Row = ShopItem & { id: string }

export function ShopTab({ tripId, trip, me }: { tripId: string; trip: Trip; me: string }) {
  const all = entries(trip.shop).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  const isDone = (s: Row) => (s.got ?? 0) >= s.qty
  const todo = all.filter((s) => !isDone(s))
  const done = all.filter(isDone)
  const pct = all.length ? Math.round((done.length / all.length) * 100) : 0

  return (
    <div className="sections">
      <AddShop onAdd={(item) => addShop(tripId, item, me)} />

      {all.length === 0 ? (
        <p className="empty">살 물건을 위에서 추가해 주세요. 마트에서 이 링크를 열고 담을 때마다 체크하면 다 같이 볼 수 있어요.</p>
      ) : (
        <>
          <div className="progress" aria-label={`${all.length}개 중 ${done.length}개 담음`}>
            <div className="progress__bar">
              <div className="progress__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="progress__text">
              {done.length === all.length ? '전부 담았어요!' : `${done.length} / ${all.length} 담음`}
            </span>
          </div>

          {todo.length > 0 && (
            <section className="section">
              <div className="section__head">
                <h2>담아야 할 것</h2>
                <span className="pill">{todo.length}</span>
              </div>
              <ul className="list">
                {todo.map((s) => (
                  <ShopRow key={s.id} tripId={tripId} item={s} me={me} />
                ))}
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section className="section">
              <div className="section__head">
                <h2>담음</h2>
                <span className="pill pill--ok">{done.length}</span>
              </div>
              <ul className="list">
                {done.map((s) => (
                  <ShopRow key={s.id} tripId={tripId} item={s} me={me} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function AddShop({ onAdd }: { onAdd: (item: { name: string; qty: number; unit: string }) => unknown }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('')
  return (
    <form
      className="card add-shop"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({ name: name.trim(), qty: Math.max(1, qty || 1), unit: unit.trim() })
        setName('')
        setQty(1)
        setUnit('')
      }}
    >
      <input
        className="input"
        placeholder="살 물건 (예: 삼겹살)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
      />
      <div className="add-shop__row">
        <Stepper value={qty} onChange={setQty} min={1} />
        <input
          className="input unit"
          placeholder="단위 (팩, 병…)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          maxLength={10}
        />
        <button className="btn btn--primary" disabled={!name.trim()}>
          추가
        </button>
      </div>
    </form>
  )
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  label = '개수',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="하나 빼기">
        −
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(Number.isNaN(n) ? min : Math.min(max, Math.max(min, n)))
        }}
        aria-label={label}
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="하나 더하기">
        +
      </button>
    </div>
  )
}

function ShopRow({ tripId, item, me }: { tripId: string; item: Row; me: string }) {
  const [editing, setEditing] = useState(false)
  const got = item.got ?? 0
  const full = got >= item.qty
  const unit = item.unit || '개'
  const pickers = Object.entries(item.pickers ?? {}).filter(([, n]) => n > 0)

  return (
    <li className={`shop ${full ? 'is-done' : got > 0 ? 'is-partial' : ''}`}>
      <div className="shop__main">
        <button
          className={`check check--big ${full ? 'is-on' : ''}`}
          role="checkbox"
          aria-checked={full ? true : got > 0 ? 'mixed' : false}
          aria-label={`${item.name} 담음`}
          onClick={() => void pick(tripId, item.id, me, full ? 'none' : 'all')}
        >
          {got > 0 && !full ? (
            <span className="check__partial">{got}</span>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          )}
        </button>
        <div className="shop__body" onClick={() => setEditing((v) => !v)}>
          <div className="shop__name">{item.name}</div>
          <div className="shop__meta">
            <span className="shop__qty">
              {item.qty > 1 || got > 0 ? `${got} / ${item.qty}${unit}` : `${item.qty}${unit}`}
            </span>
            {pickers.length > 0 && (
              <span className="shop__by">
                {pickers.map(([who, n]) => (item.qty > 1 ? `${who} ${n}` : who)).join(' · ')} 담음
              </span>
            )}
          </div>
        </div>
        {item.qty > 1 && (
          <div className="mini-step">
            <button onClick={() => void pick(tripId, item.id, me, -1)} disabled={got <= 0} aria-label="하나 빼기">
              −
            </button>
            <button onClick={() => void pick(tripId, item.id, me, 1)} disabled={full} aria-label="하나 담기">
              +
            </button>
          </div>
        )}
      </div>
      {editing && <EditShop tripId={tripId} item={item} onClose={() => setEditing(false)} />}
    </li>
  )
}

function EditShop({ tripId, item, onClose }: { tripId: string; item: Row; onClose: () => void }) {
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.qty)
  const [unit, setUnit] = useState(item.unit)
  return (
    <form
      className="shop__edit"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        void updateShop(tripId, item.id, { name: name.trim(), qty: Math.max(1, qty), unit: unit.trim() })
        onClose()
      }}
    >
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="이름" />
      <div className="add-shop__row">
        <Stepper value={qty} onChange={setQty} min={1} label="필요한 개수" />
        <input className="input unit" placeholder="단위" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={10} />
      </div>
      <div className="shop__edit-actions">
        <span className="small muted">{item.createdBy}가 추가</span>
        <ConfirmButton className="btn btn--small btn--danger-ghost" confirmLabel="한 번 더 누르면 삭제" onConfirm={() => void removeShop(tripId, item.id)}>
          삭제
        </ConfirmButton>
        <button type="button" className="btn btn--small" onClick={onClose}>
          취소
        </button>
        <button className="btn btn--small btn--primary">저장</button>
      </div>
    </form>
  )
}
