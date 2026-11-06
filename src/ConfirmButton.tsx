import { useEffect, useState, type ReactNode } from 'react'

const ARMED_MS = 3000

/**
 * 두 번 눌러야 실행되는 버튼. 첫 번째 누르면 빨갛게 바뀌며 경고 문구를 보여주고,
 * 3초 안에 한 번 더 누르면 실행한다.
 * 브라우저 confirm() 창은 전체화면/키오스크/일부 내장 브라우저에서 뜨지 않고 바로 '취소'가 되기 때문에 쓰지 않는다.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel,
  className = 'btn btn--ghost',
  disabled,
}: {
  onConfirm: () => void
  children: ReactNode
  /** 한 번 눌렀을 때 보여줄 경고 문구 */
  confirmLabel: string
  className?: string
  disabled?: boolean
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = window.setTimeout(() => setArmed(false), ARMED_MS)
    return () => window.clearTimeout(id)
  }, [armed])

  return (
    <button
      className={`${className} ${armed ? 'is-armed' : ''}`}
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onConfirm()
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  )
}
