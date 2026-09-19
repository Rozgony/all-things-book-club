import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AcceptInvitePage } from '../AcceptInvitePage'
import { supabase } from '../../../lib/supabase'
import {
  unwrapChapterKeyWithSecret,
  importChapterKey,
  fromBase64Url,
  encryptChapterKey,
} from '../../../lib/crypto'
import { getUserKey } from '../../../lib/keyStore'
import { deriveAndStoreUserKey } from '../../../lib/authKey'
import { getInvite, acceptInvite } from '../../../api/invites'
import { initializeMemberJoinedAt } from '../../../api/members'

const navigateMock = vi.fn()
let searchParamsValue = new URLSearchParams({ token: 'tok-1' })

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParamsValue],
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}))

vi.mock('../../../components/Nav', () => ({
  Nav: () => <div data-testid="nav" />,
}))

vi.mock('../../../components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}))

vi.mock('../../../lib/crypto', () => ({
  unwrapChapterKeyWithSecret: vi.fn(),
  importChapterKey: vi.fn(),
  fromBase64Url: vi.fn(),
  encryptChapterKey: vi.fn(),
}))

vi.mock('../../../lib/keyStore', () => ({
  getUserKey: vi.fn(),
}))

vi.mock('../../../lib/authKey', () => ({
  deriveAndStoreUserKey: vi.fn(),
}))

vi.mock('../../../api/invites', () => ({
  getInvite: vi.fn(),
  acceptInvite: vi.fn(),
}))

vi.mock('../../../api/members', () => ({
  initializeMemberJoinedAt: vi.fn(),
}))

const invite = { inviterName: 'Jamie', encryptedChapterKey: 'enc', keyNonce: 'nonce', expiresAt: '2026-12-31T00:00:00.000Z' }

describe('AcceptInvitePage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    searchParamsValue = new URLSearchParams({ token: 'tok-1' })
    window.location.hash = '#secret'

    vi.mocked(getInvite).mockResolvedValue(invite)
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
    vi.mocked(unwrapChapterKeyWithSecret).mockResolvedValue(new Uint8Array([1, 2, 3]))
    vi.mocked(importChapterKey).mockResolvedValue({} as CryptoKey)
    vi.mocked(fromBase64Url).mockReturnValue(new Uint8Array([9, 9, 9]))
    vi.mocked(encryptChapterKey).mockResolvedValue({ encryptedChapterKey: 'wrapped', keyNonce: 'wrap-nonce' })
    vi.mocked(getUserKey).mockReturnValue({} as CryptoKey)
    vi.mocked(deriveAndStoreUserKey).mockResolvedValue(undefined)
    vi.mocked(acceptInvite).mockResolvedValue({ chapterId: 'c1', id: 'member-1' })
    vi.mocked(initializeMemberJoinedAt).mockResolvedValue({} as never)
  })

  it('shows a loading spinner while the invite and session are loading', () => {
    vi.mocked(getInvite).mockReturnValue(new Promise(() => {}))
    render(<AcceptInvitePage />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('shows an error message when the invite is invalid', async () => {
    vi.mocked(getInvite).mockRejectedValue(new Error('gone'))
    render(<AcceptInvitePage />)
    expect(await screen.findByText('This invite is invalid or has expired.')).toBeInTheDocument()
  })

  it('shows the sign-up form for a logged-out visitor', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
    render(<AcceptInvitePage />)

    expect(await screen.findByRole('button', { name: 'Create account & accept' })).toBeInTheDocument()
    expect(screen.getByText(/Jamie has invited you/)).toBeInTheDocument()
  })

  it('shows the confirm-password form for an already logged-in visitor', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'tok' } } } as never)
    render(<AcceptInvitePage />)

    expect(await screen.findByRole('button', { name: 'Accept invite' })).toBeInTheDocument()
  })

  it('accepts the invite for an already logged-in visitor', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'tok' } } } as never)
    const user = userEvent.setup()
    const { container } = render(<AcceptInvitePage />)

    await screen.findByRole('button', { name: 'Accept invite' })
    await user.type(container.querySelector('input[type="password"]')!, 'my-password')
    await user.click(screen.getByRole('button', { name: 'Accept invite' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/chapters/c1?setName=true'))
    expect(deriveAndStoreUserKey).toHaveBeenCalledWith('tok', 'my-password')
    expect(acceptInvite).toHaveBeenCalledWith('tok-1', { encryptedChapterKey: 'wrapped', keyNonce: 'wrap-nonce' })
    expect(initializeMemberJoinedAt).toHaveBeenCalledWith('member-1', {}, expect.any(String))
  })

  it('signs up a new user and accepts the invite', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { session: { access_token: 'new-tok' } },
      error: null,
    } as never)
    const user = userEvent.setup()
    const { container } = render(<AcceptInvitePage />)

    await screen.findByRole('button', { name: 'Create account & accept' })
    await user.type(container.querySelector('input[type="email"]')!, 'new@example.com')
    await user.type(container.querySelector('input[type="password"]')!, 'my-password')
    await user.click(screen.getByRole('button', { name: 'Create account & accept' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/chapters/c1?setName=true'))
    expect(deriveAndStoreUserKey).toHaveBeenCalledWith('new-tok', 'my-password')
  })

  it('switches to the login form and accepts the invite for an existing user', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: { access_token: 'login-tok' } },
      error: null,
    } as never)
    const user = userEvent.setup()
    const { container } = render(<AcceptInvitePage />)

    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    await user.type(container.querySelector('input[type="email"]')!, 'existing@example.com')
    await user.type(container.querySelector('input[type="password"]')!, 'my-password')
    await user.click(screen.getByRole('button', { name: 'Log in & accept' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/chapters/c1?setName=true'))
    expect(deriveAndStoreUserKey).toHaveBeenCalledWith('login-tok', 'my-password')
  })

  it('shows an error message when accepting fails', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'tok' } } } as never)
    vi.mocked(acceptInvite).mockRejectedValue(new Error('Invite already used'))
    const user = userEvent.setup()
    const { container } = render(<AcceptInvitePage />)

    await screen.findByRole('button', { name: 'Accept invite' })
    await user.type(container.querySelector('input[type="password"]')!, 'my-password')
    await user.click(screen.getByRole('button', { name: 'Accept invite' }))

    expect(await screen.findByText('Invite already used')).toBeInTheDocument()
  })
})
