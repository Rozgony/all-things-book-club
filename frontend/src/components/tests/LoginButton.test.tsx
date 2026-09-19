import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginButton } from '../LoginButton'
import { supabase } from '../../lib/supabase'
import { deriveAndStoreUserKey } from '../../lib/authKey'

const navigateMock = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}))

vi.mock('../../lib/authKey', () => ({
  deriveAndStoreUserKey: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

describe('LoginButton', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    vi.mocked(deriveAndStoreUserKey).mockResolvedValue(undefined)
  })

  it('shows the sign-in form after clicking the trigger button', async () => {
    const user = userEvent.setup()
    render(<LoginButton />)

    await user.click(screen.getByText('Login / Sign-up'))
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('switches to the sign-up form', async () => {
    const user = userEvent.setup()
    render(<LoginButton />)

    await user.click(screen.getByText('Login / Sign-up'))
    await user.click(screen.getByText('Sign up'))
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('logs in, derives the user key, and navigates to /profile on success', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    } as never)
    const user = userEvent.setup()
    const { container } = render(<LoginButton />)

    await user.click(screen.getByText('Login / Sign-up'))
    await user.type(container.querySelector('input[type="email"]')!, 'a@b.com')
    await user.type(container.querySelector('input[type="password"]')!, 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/profile'))
    expect(deriveAndStoreUserKey).toHaveBeenCalledWith('token-123', 'password123')
  })

  it('shows the supabase error message when login fails', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    } as never)
    const user = userEvent.setup()
    const { container } = render(<LoginButton />)

    await user.click(screen.getByText('Login / Sign-up'))
    await user.type(container.querySelector('input[type="email"]')!, 'a@b.com')
    await user.type(container.querySelector('input[type="password"]')!, 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect(deriveAndStoreUserKey).not.toHaveBeenCalled()
  })

  it('shows an error when key derivation fails after signup', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { session: { access_token: 'token-456' } },
      error: null,
    } as never)
    vi.mocked(deriveAndStoreUserKey).mockRejectedValue(new Error('Failed to initialize encryption. Please try again.'))
    const user = userEvent.setup()
    const { container } = render(<LoginButton />)

    await user.click(screen.getByText('Login / Sign-up'))
    await user.click(screen.getByText('Sign up'))
    await user.type(container.querySelector('input[type="email"]')!, 'a@b.com')
    await user.type(container.querySelector('input[type="password"]')!, 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Failed to initialize encryption. Please try again.')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('closes the modal when the close button is clicked', async () => {
    const user = userEvent.setup()
    render(<LoginButton />)

    await user.click(screen.getByText('Login / Sign-up'))
    await user.click(screen.getByText('X'))
    expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument()
  })
})
