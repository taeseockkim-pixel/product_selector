import { useState } from 'react'
import { useAdmin } from '../contexts/AdminContext'

export default function AdminPanel() {
  const { isAdmin, adminName, login, logout } = useAdmin()
  const [open, setOpen] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [nameInput, setNameInput] = useState('')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!keyInput.trim() || !nameInput.trim()) return
    login(keyInput.trim(), nameInput.trim())
    setOpen(false)
    setKeyInput('')
  }

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">
          편집 모드 — {adminName}
        </span>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          종료
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="관리자 편집 모드"
        className="text-gray-300 hover:text-gray-500 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-64">
            <p className="text-sm font-semibold text-gray-700 mb-3">편집 모드 진입</p>
            <form onSubmit={handleLogin} className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">이름</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="홍길동"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">API 키</label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="mt-1 w-full bg-blue-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
