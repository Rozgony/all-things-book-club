import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '../LoginPage'
import { useAuthStore } from '../../../store/authStore'

const navigateMock = vi.fn()

vi.mock('../../../components/Nav', () => ({
  Nav: () => <div data-testid="nav" />,
}))

vi.mock('../../../components/LoginButton', () => ({
  LoginButton: ({ variant, buttonLabel }: { variant?: string; buttonLabel?: string }) => (
    <button>{buttonLabel || `login-${variant}`}</button>
  ),
}))

vi.mock('../SpinDemo', () => ({
  LoginSpinDemo: () => <div data-testid="spin-demo" />,
}))

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

function mockAuth(session: unknown) {
  vi.mocked(useAuthStore).mockImplementation((selector) => selector({ session } as never))
}

describe('LoginPage', () => {
  it('renders the hero heading and spin demo', () => {
    mockAuth(null)
    render(<LoginPage />)
    expect(screen.getByText('Welcome to All Things Book Club')).toBeInTheDocument()
    expect(screen.getByTestId('spin-demo')).toBeInTheDocument()
  })

  it('shows a prominent login button when logged out', () => {
    mockAuth(null)
    render(<LoginPage />)
    expect(screen.getByText('login-prominent')).toBeInTheDocument()
  })

  it('shows a My Profile button and navigates there when authenticated', async () => {
    mockAuth({})
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'My Profile' }))
    expect(navigateMock).toHaveBeenCalledWith('/profile')
  })

  it('does not show the prominent login button when authenticated', () => {
    mockAuth({})
    render(<LoginPage />)
    expect(screen.queryByText('login-prominent')).not.toBeInTheDocument()
  })
})
