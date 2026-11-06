import { useEffect, useState, type ReactNode } from 'react'
import { createTrip, joinTrip, memberKey, renameTrip, useConnected, useTrip, type Trip } from './data'
import { db } from './firebase'
import { AutoThemeIcon, MoonIcon, ShareIcon, SunIcon } from './icons'
import { PrepTab } from './PrepTab'
import { ShopTab } from './ShopTab'
import { useTheme } from './theme'

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
  const theme = useTheme()
  if (!db) return <Screen title="설정이 필요해요" desc="src/firebaseConfig.ts 에 Firebase 웹 설정값을 넣어 주세요." />
  if (!tripId) return <Home theme={theme} />
  return <TripGate key={tripId} tripId={tripId} theme={theme} />
}

type ThemeCtl = ReturnType<typeof useTheme>

function ThemeButton({ theme }: { theme: ThemeCtl }) {
  const label = { system: '시스템 설정 따라가기', light: '라이트 모드', dark: '다크 모드' }[theme.mode]
  const Icon = { system: AutoThemeIcon, light: SunIcon, dark: MoonIcon }[theme.mode]
  return (
    <button className="icon-btn icon-btn--plain" onClick={theme.cycle} aria-label={`화면 테마: ${label}`} title={label}>
      <Icon size={22} />
    </button>
  )
}

/** 이름 입력·여행 만들기 같은 한 화면짜리 단계 */
function Screen({
  title,
  desc,
  children,
  cta,
  theme,
}: {
  title: ReactNode
  desc?: ReactNode
  children?: ReactNode
  cta?: ReactNode
  theme?: ThemeCtl
}) {
  return (
    <div className="screen">
      <div className="screen__bar">{theme && <ThemeButton theme={theme} />}</div>
      <div className="screen__body">
        <h1 className="screen__title">{title}</h1>
        {desc && <p className="screen__desc">{desc}</p>}
        {children}
      </div>
      {cta && <div className="screen__cta">{cta}</div>}
    </div>
  )
}

function Home({ theme }: { theme: ThemeCtl }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      location.hash = await createTrip(name.trim())
    } catch (e) {
      setError('만들지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.')
      console.error(e)
      setBusy(false)
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Screen
        theme={theme}
        title={
          <>
            어떤 MT를
            <br />
            준비하고 있나요?
          </>
        }
        desc="준비물과 장보기 목록을 친구들과 같이 채우는 페이지예요. 만들고 나온 링크를 단톡방에 공유하세요."
        cta={
          <button className="btn btn--primary btn--xl" disabled={!name.trim() || busy}>
            {busy ? '만드는 중…' : '만들기'}
          </button>
        }
      >
        <label className="big-field">
          <span>MT 이름</span>
          <input placeholder="예: 11월 가평 MT" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        </label>
        {error && <p className="error">{error}</p>}
      </Screen>
    </form>
  )
}

function TripGate({ tripId, theme }: { tripId: string; theme: ThemeCtl }) {
  const trip = useTrip(tripId)
  const [me, setMe] = useState(() => loadName(tripId))
  const [editingName, setEditingName] = useState(false)
  // 이번 접속에서 이름을 고른 직후엔 명단 반영 전이라도 튕기지 않게
  const [picked, setPicked] = useState(false)

  if (trip === undefined) {
    return (
      <div className="loading" aria-live="polite">
        <span className="spinner" />
        불러오는 중
      </div>
    )
  }
  if (trip === null) {
    return (
      <Screen
        theme={theme}
        title="MT를 찾을 수 없어요"
        desc="링크가 잘렸거나 잘못 복사됐을 수 있어요. 받은 링크를 다시 확인해 주세요."
        cta={
          <a className="btn btn--soft btn--xl" href="#">
            새로 만들기
          </a>
        }
      />
    )
  }

  // 저장된 이름이 멤버 명단에서 빠졌으면(이름이 바뀌었거나 정리됨) 다시 고르게 한다
  const removed = !!me && !picked && !!trip.members && !(memberKey(me) in trip.members)

  if (!me || editingName || removed) {
    return (
      <NamePicker
        theme={theme}
        tripName={trip.meta.name}
        members={Object.values(trip.members ?? {}).map((m) => m.name)}
        current={removed ? '' : me}
        onCancel={me && !removed ? () => setEditingName(false) : undefined}
        onPick={(name) => {
          saveName(tripId, name)
          setMe(name)
          setPicked(true)
          setEditingName(false)
          void joinTrip(tripId, name)
        }}
      />
    )
  }

  return <TripView tripId={tripId} trip={trip} me={me} theme={theme} onChangeName={() => setEditingName(true)} />
}

function NamePicker({
  tripName,
  members,
  current,
  onPick,
  onCancel,
  theme,
}: {
  tripName: string
  members: string[]
  current: string
  onPick: (name: string) => void
  onCancel?: () => void
  theme: ThemeCtl
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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onPick(name.trim())
      }}
    >
      <Screen
        theme={theme}
        title={
          <>
            {tripName}
            <br />
            <span className="screen__title-sub">이름을 알려주세요</span>
          </>
        }
        desc="내가 올린 준비물과 장바구니에 이 이름이 보여요."
        cta={
          <>
            {onCancel && (
              <button type="button" className="btn btn--soft btn--xl" onClick={onCancel}>
                취소
              </button>
            )}
            <button className="btn btn--primary btn--xl" disabled={!name.trim()}>
              들어가기
            </button>
          </>
        }
      >
        {sorted.length > 0 && (
          <div className="pick-names">
            <p className="caption">멤버</p>
            <div className="chips">
              {sorted.map((m) => (
                <button type="button" key={m} className={`chip ${m === current ? 'is-on' : ''}`} onClick={() => onPick(m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="big-field">
          <span>{sorted.length ? '명단에 없으면 직접 입력' : '이름'}</span>
          <input placeholder="예: 김민수" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus={sorted.length === 0} />
        </label>
      </Screen>
    </form>
  )
}

type Tab = 'prep' | 'shop'

function TripView({
  tripId,
  trip,
  me,
  theme,
  onChangeName,
}: {
  tripId: string
  trip: Trip
  me: string
  theme: ThemeCtl
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
  const [toast, setToast] = useState('')

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
      setToast('링크를 복사했어요. 단톡방에 붙여 넣으세요.')
      window.setTimeout(() => setToast(''), 2200)
    } catch {
      window.prompt('이 링크를 복사하세요', url)
    }
  }

  const shop = Object.values(trip.shop ?? {})
  const shopLeft = shop.filter((s) => (s.got ?? 0) < s.qty).length

  return (
    <div className="app">
      <header className="top">
        <div className="top__row">
          <TripTitle tripId={tripId} name={trip.meta.name} />
          <ThemeButton theme={theme} />
          <button className="icon-btn icon-btn--plain" onClick={() => void share()} aria-label="링크 공유" title="링크 공유">
            <ShareIcon size={22} />
          </button>
        </div>
        <div className="top__sub">
          <button className="me" onClick={onChangeName} title="이름 바꾸기">
            <span className="avatar avatar--sm">{me.slice(0, 1)}</span>
            {me}
          </button>
          {!connected && <span className="offline">오프라인 · 연결되면 저장돼요</span>}
        </div>
        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'prep'} className="tabs__tab" onClick={() => choose('prep')}>
            준비물
          </button>
          <button role="tab" aria-selected={tab === 'shop'} className="tabs__tab" onClick={() => choose('shop')}>
            장보기
            {shop.length > 0 && shopLeft > 0 && <span className="tabs__badge num">{shopLeft}</span>}
          </button>
        </nav>
      </header>
      <main className="content">
        {tab === 'prep' ? <PrepTab tripId={tripId} trip={trip} me={me} /> : <ShopTab tripId={tripId} trip={trip} me={me} />}
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

function TripTitle({ tripId, name }: { tripId: string; name: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  if (!editing) {
    return (
      <h1 className="trip-name">
        <button onClick={() => (setValue(name), setEditing(true))} title="눌러서 이름 바꾸기">
          {name}
        </button>
      </h1>
    )
  }
  const done = () => {
    if (value.trim() && value.trim() !== name) void renameTrip(tripId, value.trim())
    setEditing(false)
  }
  return (
    <input
      className="field trip-name-input"
      value={value}
      autoFocus
      maxLength={40}
      onChange={(e) => setValue(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === 'Enter') done()
        if (e.key === 'Escape') setEditing(false)
      }}
      aria-label="MT 이름"
    />
  )
}
