import { useEffect, useState } from 'react'
import { createTrip, joinTrip, renameTrip, useConnected, useTrip } from './data'
import { db } from './firebase'
import { PrepTab } from './PrepTab'
import { ShopTab } from './ShopTab'

/** 주소 끝 #abc12345 가 여행 코드 */
function useHashTripId() {
  const read = () => decodeURIComponent(location.hash.replace(/^#\/?/, '')).trim()
  const [id, setId] = useState(read)
  useEffect(() => {
    const on = () => setId(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return id
}

const nameKey = (tripId: string) => `mtpack:name:${tripId}`
function loadName(tripId: string) {
  try {
    return localStorage.getItem(nameKey(tripId)) ?? ''
  } catch {
    return ''
  }
}
function saveName(tripId: string, name: string) {
  try {
    localStorage.setItem(nameKey(tripId), name)
    localStorage.setItem('mtpack:lastName', name)
  } catch {
    /* 저장 못 해도 이번 접속 동안은 쓸 수 있다 */
  }
}

export function App() {
  const tripId = useHashTripId()
  if (!db) return <SetupNeeded />
  if (!tripId) return <Home />
  return <TripGate key={tripId} tripId={tripId} />
}

function SetupNeeded() {
  return (
    <main className="center">
      <div className="card narrow">
        <h1 className="title">설정이 필요해요</h1>
        <p className="muted">src/firebaseConfig.ts 에 Firebase 웹 설정값을 넣어 주세요.</p>
      </div>
    </main>
  )
}

function Home() {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const id = await createTrip(name.trim())
      location.hash = id
    } catch (e) {
      setError('만들지 못했어요. 인터넷 연결을 확인해 주세요.')
      console.error(e)
      setBusy(false)
    }
  }
  return (
    <main className="center">
      <div className="card narrow">
        <div className="logo" aria-hidden>
          <img src="./favicon.svg" alt="" width={48} height={48} />
        </div>
        <h1 className="title">MT 준비물</h1>
        <p className="muted">
          각자 챙길 준비물과 장보기 목록을 같이 보는 페이지예요.
          <br />
          여행을 만들고 나온 링크를 단톡방에 공유하세요.
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <input
            className="input"
            placeholder="예: 11월 가평 MT"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <button className="btn btn--primary" disabled={!name.trim() || busy}>
            {busy ? '만드는 중…' : '여행 만들기'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </main>
  )
}

function TripGate({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId)
  const [me, setMe] = useState(() => loadName(tripId))
  const [editingName, setEditingName] = useState(false)

  if (trip === undefined) {
    return (
      <main className="center">
        <p className="muted">불러오는 중…</p>
      </main>
    )
  }
  if (trip === null) {
    return (
      <main className="center">
        <div className="card narrow">
          <h1 className="title">여행을 찾을 수 없어요</h1>
          <p className="muted">링크가 맞는지 확인해 주세요.</p>
          <a className="btn btn--ghost" href="#">
            새 여행 만들기
          </a>
        </div>
      </main>
    )
  }

  if (!me || editingName) {
    return (
      <NamePicker
        tripName={trip.meta.name}
        members={Object.values(trip.members ?? {}).map((m) => m.name)}
        current={me}
        onCancel={me ? () => setEditingName(false) : undefined}
        onPick={(name) => {
          saveName(tripId, name)
          setMe(name)
          setEditingName(false)
          void joinTrip(tripId, name)
        }}
      />
    )
  }

  return <TripView tripId={tripId} trip={trip} me={me} onChangeName={() => setEditingName(true)} />
}

function NamePicker({
  tripName,
  members,
  current,
  onPick,
  onCancel,
}: {
  tripName: string
  members: string[]
  current: string
  onPick: (name: string) => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(() => {
    if (current) return current
    try {
      return localStorage.getItem('mtpack:lastName') ?? ''
    } catch {
      return ''
    }
  })
  const sorted = [...members].sort((a, b) => a.localeCompare(b, 'ko'))
  return (
    <main className="center">
      <div className="card narrow">
        <p className="eyebrow">{tripName}</p>
        <h1 className="title">이름이 뭐예요?</h1>
        <p className="muted">내가 올린 준비물과 장바구니에 이 이름이 표시돼요.</p>
        {sorted.length > 0 && (
          <div className="chips">
            {sorted.map((m) => (
              <button key={m} className={`chip ${m === current ? 'is-on' : ''}`} onClick={() => onPick(m)}>
                {m}
              </button>
            ))}
          </div>
        )}
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) onPick(name.trim())
          }}
        >
          <input
            className="input"
            placeholder={sorted.length ? '목록에 없으면 이름 입력' : '이름 입력'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus={sorted.length === 0}
          />
          <button className="btn btn--primary" disabled={!name.trim()}>
            들어가기
          </button>
          {onCancel && (
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              취소
            </button>
          )}
        </form>
      </div>
    </main>
  )
}

type Tab = 'prep' | 'shop'

function TripView({
  tripId,
  trip,
  me,
  onChangeName,
}: {
  tripId: string
  trip: NonNullable<ReturnType<typeof useTrip>>
  me: string
  onChangeName: () => void
}) {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (sessionStorage.getItem('mtpack:tab') as Tab) || 'prep'
    } catch {
      return 'prep'
    }
  })
  const connected = useConnected()
  const [copied, setCopied] = useState(false)

  const choose = (t: Tab) => {
    setTab(t)
    try {
      sessionStorage.setItem('mtpack:tab', t)
    } catch {
      /* 무시 */
    }
    window.scrollTo({ top: 0 })
  }

  const share = async () => {
    const url = location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.meta.name, text: `${trip.meta.name} 준비물·장보기`, url })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('이 링크를 복사하세요', url)
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const shop = Object.values(trip.shop ?? {})
  const shopLeft = shop.filter((s) => (s.got ?? 0) < s.qty).length

  return (
    <div className="app">
      <header className="top">
        <div className="top__row">
          <TripTitle tripId={tripId} name={trip.meta.name} />
          <button className="btn btn--small" onClick={() => void share()}>
            {copied ? '복사됨' : '링크 공유'}
          </button>
        </div>
        <div className="top__row top__sub">
          <button className="me" onClick={onChangeName} title="이름 바꾸기">
            <span className="avatar">{me.slice(0, 1)}</span>
            {me}
          </button>
          {!connected && <span className="offline">오프라인 · 연결되면 저장돼요</span>}
        </div>
        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'prep'} className="tab" onClick={() => choose('prep')}>
            준비물
          </button>
          <button role="tab" aria-selected={tab === 'shop'} className="tab" onClick={() => choose('shop')}>
            장보기
            {shop.length > 0 && <span className="badge">{shopLeft === 0 ? '완료' : `${shopLeft}`}</span>}
          </button>
        </nav>
      </header>
      <main className="content">
        {tab === 'prep' ? <PrepTab tripId={tripId} trip={trip} me={me} /> : <ShopTab tripId={tripId} trip={trip} me={me} />}
      </main>
    </div>
  )
}

function TripTitle({ tripId, name }: { tripId: string; name: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  if (!editing) {
    return (
      <h1 className="trip-name" onClick={() => (setValue(name), setEditing(true))} title="눌러서 이름 바꾸기">
        {name}
      </h1>
    )
  }
  const done = () => {
    if (value.trim() && value.trim() !== name) void renameTrip(tripId, value.trim())
    setEditing(false)
  }
  return (
    <input
      className="input trip-name-input"
      value={value}
      autoFocus
      maxLength={40}
      onChange={(e) => setValue(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === 'Enter') done()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}
