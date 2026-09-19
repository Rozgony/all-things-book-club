import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '../../store/authStore'
import * as keyStore from '../../lib/keyStore'

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../lib/keyStore', () => ({
  hasUserKey: vi.fn(),
  restoreUserKey: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
}))

function mockAuthState(state: { session: unknown; loading: boolean }) {
  vi.mocked(useAuthStore).mockImplementation((selector) => selector(state as never))
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(keyStore.restoreUserKey).mockResolvedValue(false)
  })

  it('shows a loading state while auth is initializing', async () => {
    mockAuthState({ session: null, loading: true })
    vi.mocked(keyStore.hasUserKey).mockReturnValue(false)

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    )
    expect(await screen.findByText('Loading...')).toBeInTheDocument()
  })

  it('redirects to /login when there is no session', async () => {
    mockAuthState({ session: null, loading: false })
    vi.mocked(keyStore.hasUserKey).mockReturnValue(false)

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    )
    expect(await screen.findByTestId('navigate')).toHaveTextContent('/login')
  })

  it('redirects to /login when the user key is not ready', async () => {
    mockAuthState({ session: {}, loading: false })
    vi.mocked(keyStore.hasUserKey).mockReturnValue(false)

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    )
    expect(await screen.findByTestId('navigate')).toHaveTextContent('/login')
  })

  it('renders children when authenticated and the key is ready', async () => {
    mockAuthState({ session: {}, loading: false })
    vi.mocked(keyStore.hasUserKey).mockReturnValue(true)

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    )
    expect(await screen.findByText('secret')).toBeInTheDocument()
  })

  it('attempts to restore the user key on mount when not already ready', async () => {
    mockAuthState({ session: {}, loading: false })
    vi.mocked(keyStore.hasUserKey).mockReturnValue(false)
    vi.mocked(keyStore.restoreUserKey).mockResolvedValue(true)

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    )
    await screen.findByText('secret')
    expect(keyStore.restoreUserKey).toHaveBeenCalled()
  })
})
