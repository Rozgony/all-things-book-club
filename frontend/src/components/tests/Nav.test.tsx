import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from '../Nav'
import { useAuthStore } from '../../store/authStore'

const navigateMock = vi.fn()
const signOutMock = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: {} },
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

function mockAuth(session: unknown) {
  vi.mocked(useAuthStore).mockImplementation((selector) =>
    selector({ session, signOut: signOutMock } as never)
  )
}

describe('Nav', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    signOutMock.mockClear()
  })

  it('always renders the site title', () => {
    mockAuth(null)
    render(<Nav />)
    expect(screen.getByText('All Things Book Club')).toBeInTheDocument()
  })

  it('hides authenticated-only links when logged out', () => {
    mockAuth(null)
    render(<Nav showChapters showProfile showLogout />)
    expect(screen.queryByText('All Chapters')).not.toBeInTheDocument()
    expect(screen.queryByText('Profile')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })

  it('shows requested links when authenticated and wires up their actions', async () => {
    mockAuth({})
    const user = userEvent.setup()
    render(<Nav showChapters showProfile showLogout username="Jamie" />)

    await user.click(screen.getByText('All Chapters'))
    expect(navigateMock).toHaveBeenCalledWith('/chapters')

    await user.click(screen.getByText('Jamie'))
    expect(navigateMock).toHaveBeenCalledWith('/profile')

    await user.click(screen.getByText('Sign out'))
    expect(signOutMock).toHaveBeenCalledOnce()
  })

  it('renders a login button when showLogin is set and logged out', () => {
    mockAuth(null)
    render(<Nav showLogin />)
    expect(screen.getByText('Login / Sign-up')).toBeInTheDocument()
  })

  it('renders a profile link instead of login when showLogin is set and authenticated', () => {
    mockAuth({})
    render(<Nav showLogin username="Jamie" />)
    expect(screen.getByText('Jamie')).toBeInTheDocument()
    expect(screen.queryByText('Login / Sign-up')).not.toBeInTheDocument()
  })
})
