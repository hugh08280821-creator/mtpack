import { useState } from 'react'
import { ConfirmButton } from './ConfirmButton'
import { addPrep, entries, removePrep, updatePrep, type PrepItem, type Trip } from './data'
import { CheckIcon, ChevronIcon, CloseIcon } from './icons'

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
    <>
      <section className="block">
        <h2 className="block__title">
          내 준비물 <Count items={mine} />
        </h2>
        <p className="block__desc">내가 따로 챙겨 갈 것. 다른 사람도 볼 수 있어요.</p>
        {mine.length > 0 && (
          <ul className="rows">
            {mine.map((p) => (
              <PrepRow key={p.id} tripId={tripId} item={p} canCheck canDelete />
            ))}
          </ul>
        )}
        <AddLine placeholder="수건, 충전기처럼 쉼표로 여러 개" onAdd={(text) => addPrep(tripId, { text, shared: false, owner: me }, me)} />
      </section>

      <section className="block">
        <h2 className="block__title">
          공용 준비물{' '}
          {unassigned > 0 ? <span className="count count--warn">담당 없음 {unassigned}</span> : <Count items={shared} />}
        </h2>
        <p className="block__desc">한 명만 챙기면 되는 것. 맡을 사람이 "내가 챙길게"를 눌러요.</p>
        {shared.length > 0 && (
          <ul className="rows">
            {shared.map((p) => (
              <SharedRow key={p.id} tripId={tripId} item={p} me={me} />
            ))}
          </ul>
        )}
        <AddLine placeholder="스피커, 보드게임, 멀티탭" onAdd={(text) => addPrep(tripId, { text, shared: true, owner: null }, me)} />
      </section>

      <section className="block">
        <h2 className="block__title">다른 사람 준비물</h2>
        {others.length === 0 ? (
          <p className="empty">
            아직 아무도 안 들어왔어요.
            <br />
            위의 공유 버튼으로 친구들을 불러 주세요.
          </p>
        ) : (
          <div className="people">
            {others.map((name) => (
              <Person
                key={name}
                tripId={tripId}
                name={name}
                items={personal.filter((p) => p.owner === name)}
                shared={shared.filter((s) => s.owner === name)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function Person({ tripId, name, items, shared }: { tripId: string; name: string; items: Row[]; shared: Row[] }) {
  const [open, setOpen] = useState(items.length > 0 && items.length <= 6)
  return (
    <div className={`person ${open ? 'is-open' : ''}`}>
      <button className="person__head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="avatar">{name.slice(0, 1)}</span>
        <span className="person__name">{name}</span>
        {items.length === 0 ? <span className="caption">아직 안 올렸어요</span> : <Count items={items} />}
        <ChevronIcon size={18} className="person__chev" />
      </button>
      {open && (items.length > 0 || shared.length > 0) && (
        <div className="person__body">
          {items.length > 0 && (
            <ul className="rows rows--tight">
              {items.map((p) => (
                <PrepRow key={p.id} tripId={tripId} item={p} />
              ))}
            </ul>
          )}
          {shared.length > 0 && <p className="caption person__shared">공용 담당 · {shared.map((s) => s.text).join(', ')}</p>}
        </div>
      )}
    </div>
  )
}

function Count({ items }: { items: { done: boolean }[] }) {
  if (items.length === 0) return null
  const done = items.filter((i) => i.done).length
  return (
    <span className={`count ${done === items.length ? 'count--done' : ''}`}>
      {done}/{items.length}
    </span>
  )
}

function Tick({ checked, onToggle, label, disabled }: { checked: boolean; onToggle?: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      className={`tick ${checked ? 'is-on' : ''}`}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
    >
      <CheckIcon size={15} />
    </button>
  )
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <ConfirmButton className="icon-btn" confirmLabel="삭제" onConfirm={onConfirm}>
      <CloseIcon size={18} aria-label="삭제" />
    </ConfirmButton>
  )
}

function PrepRow({ tripId, item, canCheck, canDelete }: { tripId: string; item: Row; canCheck?: boolean; canDelete?: boolean }) {
  return (
    <li className={`row ${item.done ? 'is-done' : ''}`}>
      <Tick
        checked={item.done}
        label={`${item.text} 챙김`}
        disabled={!canCheck}
        onToggle={() => void updatePrep(tripId, item.id, { done: !item.done })}
      />
      <span className="row__text">{item.text}</span>
      {canDelete && <DeleteButton onConfirm={() => void removePrep(tripId, item.id)} />}
    </li>
  )
}

function SharedRow({ tripId, item, me }: { tripId: string; item: Row; me: string }) {
  const mine = item.owner === me
  return (
    <li className={`row ${item.done ? 'is-done' : ''}`}>
      <Tick
        checked={item.done}
        label={`${item.text} 챙김`}
        disabled={!item.owner}
        onToggle={() => void updatePrep(tripId, item.id, { done: !item.done })}
      />
      <span className="row__text">{item.text}</span>
      {item.owner ? (
        mine ? (
          <button
            className="tag tag--me"
            onClick={() => void updatePrep(tripId, item.id, { owner: null, done: false })}
            title="담당 그만두기"
          >
            내가 챙김
            <CloseIcon size={14} />
          </button>
        ) : (
          <span className="tag">{item.owner}</span>
        )
      ) : (
        <button className="btn btn--soft btn--sm" onClick={() => void updatePrep(tripId, item.id, { owner: me })}>
          내가 챙길게
        </button>
      )}
      <DeleteButton onConfirm={() => void removePrep(tripId, item.id)} />
    </li>
  )
}

function AddLine({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => unknown }) {
  const [text, setText] = useState('')
  const submit = () => {
    // 쉼표로 여러 개 한 번에
    text
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((p) => onAdd(p))
    setText('')
  }
  return (
    <form
      className="add-line"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input className="field" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={80} />
      <button className="btn btn--primary" disabled={!text.trim()}>
        추가
      </button>
    </form>
  )
}
