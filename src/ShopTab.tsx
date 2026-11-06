import { useState } from 'react'
import { ConfirmButton } from './ConfirmButton'
import { addShop, entries, memberKey, pick, removeShop, updateShop, type ShopItem, type Trip } from './data'
import { CheckIcon, MinusIcon, PlusIcon } from './icons'
import { fmtAmount, isMeasure, stepFor, suggestsGrams, UNIT_PRESETS } from './units'

type Row = ShopItem & { id: string }

export function ShopTab({ tripId, trip, me }: { tripId: string; trip: Trip; me: string }) {
  const all = entries(trip.shop).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  const isDone = (s: Row) => (s.got ?? 0) >= s.qty
  const todo = all.filter((s) => !isDone(s))
  const done = all.filter(isDone)
  const pct = all.length ? Math.round((done.length / all.length) * 100) : 0

  return (
    <>
      <section className="block">
        <h2 className="block__title">살 물건 추가</h2>
        <AddShop onAdd={(item) => addShop(tripId, item, me)} />
      </section>

      {all.length === 0 ? (
        <section className="block">
          <p className="empty">
            아직 살 물건이 없어요.
            <br />
            마트에서 이 링크를 열고 담을 때마다 체크하면 다 같이 볼 수 있어요.
          </p>
        </section>
      ) : (
        <>
          <section className="block">
            <div className="summary">
              <p className="summary__big">
                {done.length === all.length ? (
                  '다 담았어요'
                ) : (
                  <>
                    <span className="num">{todo.length}</span>개 남았어요
                  </>
                )}
              </p>
              <span className="summary__sub num">
                {done.length} / {all.length}
              </span>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress__fill" style={{ width: `${pct}%` }} />
            </div>

            {todo.length > 0 && (
              <ul className="rows">
                {todo.map((s) => (
                  <ShopRow key={s.id} tripId={tripId} item={s} me={me} />
                ))}
              </ul>
            )}
          </section>

          {done.length > 0 && (
            <section className="block">
              <h2 className="block__title">
                담은 것 <span className="count">{done.length}</span>
              </h2>
              <ul className="rows">
                {done.map((s) => (
                  <ShopRow key={s.id} tripId={tripId} item={s} me={me} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  )
}

/* ---------- 수량 + 단위 입력 ---------- */

function AmountField({
  qty,
  unit,
  onChange,
}: {
  qty: number
  unit: string
  onChange: (qty: number, unit: string, touchedUnit: boolean) => void
}) {
  const preset = (UNIT_PRESETS as readonly string[]).includes(unit) ? unit : unit === '' ? '개' : 'custom'
  const [custom, setCustom] = useState(preset === 'custom')
  const step = stepFor(unit)

  const setUnit = (u: string) => {
    // 개수 ↔ g 사이를 바꾸면 기본 양도 같이 바꿔 준다
    let q = qty
    if (stepFor(u) !== step) q = stepFor(u) === 100 ? 600 : 1
    onChange(q, u, true)
  }

  return (
    <div className="amount">
      <div className="seg" role="radiogroup" aria-label="단위">
        {UNIT_PRESETS.map((u) => (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={!custom && preset === u}
            className="seg__opt"
            onClick={() => {
              setCustom(false)
              setUnit(u)
            }}
          >
            {u}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          className="seg__opt"
          onClick={() => {
            setCustom(true)
            if (!custom) setUnit('')
          }}
        >
          직접
        </button>
      </div>
      <div className="amount__row">
        <Stepper value={qty} step={step} min={step === 100 ? 0 : 1} onChange={(q) => onChange(q, unit, false)} />
        {custom ? (
          <input
            className="field field--unit"
            placeholder="단위 (예: 봉지)"
            value={unit}
            onChange={(e) => onChange(qty, e.target.value, true)}
            maxLength={8}
            autoFocus
          />
        ) : (
          <span className="amount__unit">{unit || '개'}</span>
        )}
      </div>
    </div>
  )
}

function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99999,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`${step} 빼기`}>
        <MinusIcon size={18} />
      </button>
      <input
        inputMode="numeric"
        className="num"
        value={value.toLocaleString('ko-KR')}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(Number.isNaN(n) ? min : clamp(n))
        }}
        aria-label="양"
      />
      <button type="button" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`${step} 더하기`}>
        <PlusIcon size={18} />
      </button>
    </div>
  )
}

function AddShop({ onAdd }: { onAdd: (item: { name: string; qty: number; unit: string }) => unknown }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('개')
  const [unitTouched, setUnitTouched] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const onName = (v: string) => {
    setName(v)
    if (unitTouched) return
    // 고기류는 알아서 g 단위로
    if (suggestsGrams(v) && unit !== 'g') {
      setUnit('g')
      setQty(600)
    } else if (!suggestsGrams(v) && unit === 'g') {
      setUnit('개')
      setQty(1)
    }
  }

  const valid = name.trim() && qty > 0

  return (
    <form
      className="add-shop"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onAdd({ name: name.trim(), qty, unit: unit.trim() || '개' })
        setName('')
        setQty(1)
        setUnit('개')
        setUnitTouched(false)
        setFormKey((k) => k + 1)
      }}
    >
      <input className="field" placeholder="예: 삼겹살, 콜라, 쌈장" value={name} onChange={(e) => onName(e.target.value)} maxLength={60} />
      <AmountField
        key={formKey}
        qty={qty}
        unit={unit}
        onChange={(q, u, touched) => {
          setQty(q)
          setUnit(u)
          if (touched) setUnitTouched(true)
        }}
      />
      <button className="btn btn--primary btn--block" disabled={!valid}>
        추가하기
      </button>
    </form>
  )
}

/* ---------- 목록 한 줄 ---------- */

function ShopRow({ tripId, item, me }: { tripId: string; item: Row; me: string }) {
  const [panel, setPanel] = useState<'none' | 'edit' | 'pick'>('none')
  const got = item.got ?? 0
  const full = got >= item.qty
  const measure = isMeasure(item.unit)
  const pickers = Object.entries(item.pickers ?? {}).filter(([, n]) => n > 0)
  const toggle = (p: 'edit' | 'pick') => setPanel((v) => (v === p ? 'none' : p))

  return (
    <li className={`shop ${full ? 'is-done' : got > 0 ? 'is-partial' : ''}`}>
      <div className="shop__main">
        <button
          className={`tick tick--lg ${full ? 'is-on' : got > 0 ? 'is-mixed' : ''}`}
          role="checkbox"
          aria-checked={full ? true : got > 0 ? 'mixed' : false}
          aria-label={`${item.name} 전부 담음`}
          onClick={() => void pick(tripId, item.id, me, full ? 'none' : 'all')}
        >
          <CheckIcon size={18} />
        </button>
        <button className="shop__body" onClick={() => toggle('edit')} aria-expanded={panel === 'edit'}>
          <span className="shop__name">{item.name}</span>
          <span className="shop__meta">
            <span className="shop__qty num">
              {got > 0 && !full ? `${got.toLocaleString('ko-KR')} / ${fmtAmount(item.qty, item.unit)}` : fmtAmount(item.qty, item.unit)}
            </span>
            {pickers.length > 0 && (
              <span className="shop__by">
                {pickers
                  .map(([who, n]) => (item.qty > 1 && pickers.length > 1 ? `${who} ${n.toLocaleString('ko-KR')}` : who))
                  .join(' · ')}{' '}
                담음
              </span>
            )}
          </span>
        </button>
        {!full &&
          (measure ? (
            <button className={`btn btn--soft btn--sm ${panel === 'pick' ? 'is-active' : ''}`} onClick={() => toggle('pick')}>
              담기
            </button>
          ) : (
            item.qty > 1 && (
              <div className="mini">
                <button onClick={() => void pick(tripId, item.id, me, -1)} disabled={got <= 0} aria-label="하나 빼기">
                  <MinusIcon size={18} />
                </button>
                <button className="mini--plus" onClick={() => void pick(tripId, item.id, me, 1)} aria-label="하나 담기">
                  <PlusIcon size={18} />
                </button>
              </div>
            )
          ))}
      </div>
      {panel === 'pick' && !full && (
        <PickPanel item={item} me={me} onPick={(n) => void pick(tripId, item.id, me, n)} onDone={() => setPanel('none')} />
      )}
      {panel === 'edit' && <EditShop tripId={tripId} item={item} onClose={() => setPanel('none')} />}
    </li>
  )
}

/** g·ml 같은 단위를 원하는 만큼 담는 패널 */
function PickPanel({ item, me, onPick, onDone }: { item: Row; me: string; onPick: (n: number) => void; onDone: () => void }) {
  const left = item.qty - (item.got ?? 0)
  const mine = item.pickers?.[memberKey(me)] ?? 0
  const [amount, setAmount] = useState('')
  const quick = [100, 300, 500, 1000].filter((n) => n < left)
  const n = parseInt(amount.replace(/\D/g, ''), 10)

  const put = (v: number) => {
    onPick(v)
    setAmount('')
    if (v >= left) onDone()
  }

  return (
    <div className="panel">
      <p className="panel__lead">
        남은 양 <strong className="num">{fmtAmount(left, item.unit)}</strong>
      </p>
      <div className="quick">
        {quick.map((q) => (
          <button key={q} className="chip" onClick={() => put(q)}>
            +{fmtAmount(q, item.unit)}
          </button>
        ))}
        <button className="chip chip--strong" onClick={() => put(left)}>
          남은 거 전부
        </button>
      </div>
      <form
        className="panel__row"
        onSubmit={(e) => {
          e.preventDefault()
          if (n > 0) put(Math.min(n, left))
        }}
      >
        <div className="field-unit">
          <input
            className="field num"
            inputMode="numeric"
            placeholder="직접 입력"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            aria-label={`담은 양 (${item.unit})`}
          />
          <span>{item.unit}</span>
        </div>
        <button className="btn btn--primary" disabled={!(n > 0)}>
          담기
        </button>
      </form>
      {mine > 0 && (
        <button className="link" onClick={() => onPick(-mine)}>
          내가 담은 {fmtAmount(mine, item.unit)} 되돌리기
        </button>
      )}
    </div>
  )
}

function EditShop({ tripId, item, onClose }: { tripId: string; item: Row; onClose: () => void }) {
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.qty)
  const [unit, setUnit] = useState(item.unit || '개')
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || qty <= 0) return
        void updateShop(tripId, item.id, { name: name.trim(), qty, unit: unit.trim() || '개' })
        onClose()
      }}
    >
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="이름" />
      <AmountField
        qty={qty}
        unit={unit}
        onChange={(q, u) => {
          setQty(q)
          setUnit(u)
        }}
      />
      <div className="panel__actions">
        <span className="caption">{item.createdBy} 님이 추가</span>
        <ConfirmButton className="btn btn--sm btn--danger" confirmLabel="한 번 더 누르면 삭제" onConfirm={() => void removeShop(tripId, item.id)}>
          삭제
        </ConfirmButton>
        <button className="btn btn--sm btn--primary" disabled={!name.trim() || qty <= 0}>
          저장
        </button>
      </div>
    </form>
  )
}
