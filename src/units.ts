/** 무게·부피처럼 조금씩 나눠 담는 단위 */
export const MEASURE_UNITS = ['g', 'kg', 'ml', 'L']
export const isMeasure = (unit: string) => MEASURE_UNITS.includes(unit.trim())

export const UNIT_PRESETS = ['개', '팩', '병', 'g'] as const

/** 단위마다 +/− 한 번에 움직이는 양 */
export const stepFor = (unit: string) => (unit.trim() === 'g' || unit.trim() === 'ml' ? 100 : 1)

const MEAT = /고기|삼겹|목살|항정|갈비|등심|안심|차돌|우삼겹|돼지|소고기|한우|닭|오리|새우|소시지|베이컨|전지|앞다리|가브리살|토시살|부채살|채끝/

/** 이름만 보고 g이 어울리는 물건인지 (고기류) */
export const suggestsGrams = (name: string) => MEAT.test(name)

/** 1,000 이상이면 한 단계 큰 단위로 (g → kg, ml → L) */
const BIGGER: Record<string, string> = { g: 'kg', ml: 'L' }

export function fmtAmount(n: number, unit: string) {
  const u = unit.trim() || '개'
  const big = BIGGER[u]
  if (big && n >= 1000) {
    return `${(n / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${big}`
  }
  return `${n.toLocaleString('ko-KR')}${u}`
}

/** 큰 단위로 바뀌는 양인지 (입력할 때 옆에 환산값을 보여줄지) */
export const isScaled = (n: number, unit: string) => !!BIGGER[unit.trim()] && n >= 1000
