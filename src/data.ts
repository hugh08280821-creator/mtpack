import {
  get,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from './firebase'

export interface PrepItem {
  text: string
  /** 공용 준비물이면 true. 담당자(owner)는 비어 있을 수 있다 */
  shared: boolean
  /** 챙겨 오는 사람 이름. 공용인데 아직 담당자가 없으면 null */
  owner: string | null
  done: boolean
  createdBy: string
  createdAt: number
}

export interface ShopItem {
  name: string
  qty: number
  unit: string
  /** 지금까지 담은 개수 */
  got: number
  /** 누가 몇 개 담았는지 */
  pickers?: Record<string, number>
  createdBy: string
  createdAt: number
}

export interface Trip {
  meta: { name: string; createdAt: number }
  members?: Record<string, { name: string; joinedAt: number }>
  prep?: Record<string, PrepItem>
  shop?: Record<string, ShopItem>
}

const need = () => {
  if (!db) throw new Error('Firebase 설정이 없어요')
  return db
}
const tripRef = (tripId: string, path = '') => ref(need(), `trips/${tripId}${path ? '/' + path : ''}`)

// ---------- 여행 ----------

const ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'
function randomId(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join('')
}

export async function createTrip(name: string) {
  let id = randomId()
  while ((await get(tripRef(id))).exists()) id = randomId()
  await set(tripRef(id, 'meta'), { name, createdAt: serverTimestamp() })
  return id
}

/** undefined: 불러오는 중, null: 없는 여행 */
export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined)
  useEffect(() => {
    return onValue(tripRef(tripId), (snap) => setTrip(snap.exists() ? (snap.val() as Trip) : null))
  }, [tripId])
  return trip
}

export function useConnected() {
  const [connected, setConnected] = useState(true)
  useEffect(() => {
    if (!db) return
    // 처음 몇 초는 연결 중이라 false가 오는데, 그때 '오프라인'이 깜빡이지 않게 잠깐 기다린다
    let timer = 0
    const off = onValue(ref(db, '.info/connected'), (snap) => {
      window.clearTimeout(timer)
      if (snap.val() === true) setConnected(true)
      else timer = window.setTimeout(() => setConnected(false), 2500)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [])
  return connected
}

export function joinTrip(tripId: string, name: string) {
  return set(tripRef(tripId, `members/${memberKey(name)}`), { name, joinedAt: serverTimestamp() })
}

/** Firebase 키로 못 쓰는 문자( . # $ [ ] / )를 바꿔서 이름을 키로 쓴다 */
export function memberKey(name: string) {
  return name.replace(/[.#$[\]/]/g, '_')
}

export function renameTrip(tripId: string, name: string) {
  return update(tripRef(tripId, 'meta'), { name })
}

// ---------- 준비물 ----------

export function addPrep(tripId: string, item: Pick<PrepItem, 'text' | 'shared' | 'owner'>, by: string) {
  return push(tripRef(tripId, 'prep'), {
    ...item,
    done: false,
    createdBy: by,
    createdAt: serverTimestamp(),
  })
}

export function updatePrep(tripId: string, id: string, patch: Partial<PrepItem>) {
  return update(tripRef(tripId, `prep/${id}`), patch)
}

export function removePrep(tripId: string, id: string) {
  return remove(tripRef(tripId, `prep/${id}`))
}

// ---------- 장보기 ----------

export function addShop(tripId: string, item: Pick<ShopItem, 'name' | 'qty' | 'unit'>, by: string) {
  return push(tripRef(tripId, 'shop'), {
    ...item,
    got: 0,
    createdBy: by,
    createdAt: serverTimestamp(),
  })
}

export function updateShop(tripId: string, id: string, patch: Partial<Pick<ShopItem, 'name' | 'qty' | 'unit'>>) {
  return update(tripRef(tripId, `shop/${id}`), patch)
}

export function removeShop(tripId: string, id: string) {
  return remove(tripRef(tripId, `shop/${id}`))
}

/**
 * 담은 개수를 바꾼다. 여러 명이 동시에 눌러도 숫자가 꼬이지 않게 트랜잭션으로 처리.
 * delta > 0 이면 내가 담은 것, < 0 이면 빼기(내가 담은 것부터, 모자라면 다른 사람 것에서).
 * 'all'은 남은 걸 전부 내가 담음, 'none'은 전부 비움.
 */
export function pick(tripId: string, id: string, who: string, change: number | 'all' | 'none') {
  return runTransaction(tripRef(tripId, `shop/${id}`), (item: ShopItem | null) => {
    if (!item) return item
    const pickers: Record<string, number> = { ...(item.pickers ?? {}) }
    const key = memberKey(who)
    let got = item.got ?? 0

    if (change === 'none') {
      return { ...item, got: 0, pickers: null }
    }
    const delta = change === 'all' ? Math.max(0, item.qty - got) : change
    if (delta > 0) {
      const add = Math.min(delta, Math.max(0, item.qty - got))
      if (add === 0) return item
      pickers[key] = (pickers[key] ?? 0) + add
      got += add
    } else if (delta < 0) {
      let left = Math.min(-delta, got)
      got -= left
      const order = [key, ...Object.keys(pickers).filter((k) => k !== key)]
      for (const k of order) {
        if (left === 0) break
        const take = Math.min(left, pickers[k] ?? 0)
        pickers[k] = (pickers[k] ?? 0) - take
        left -= take
        if (pickers[k] <= 0) delete pickers[k]
      }
    }
    return { ...item, got, pickers: Object.keys(pickers).length ? pickers : null }
  })
}

// ---------- 공통 ----------

export function entries<T>(rec: Record<string, T> | undefined) {
  return Object.entries(rec ?? {}).map(([id, v]) => ({ id, ...v }))
}
