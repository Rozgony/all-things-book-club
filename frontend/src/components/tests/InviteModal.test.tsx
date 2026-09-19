import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteModal } from '../InviteModal'
import { getChapterKey } from '../../lib/keyStore'
import { wrapChapterKeyWithSecret } from '../../lib/crypto'
import { createInvite, createInviteAndEmail } from '../../api/invites'
import { getMyProfile } from '../../api/users'

vi.mock('../../lib/keyStore', () => ({
  getChapterKey: vi.fn(),
}))

vi.mock('../../lib/crypto', () => ({
  wrapChapterKeyWithSecret: vi.fn(),
}))

vi.mock('../../api/invites', () => ({
  createInvite: vi.fn(),
  createInviteAndEmail: vi.fn(),
}))

vi.mock('../../api/users', () => ({
  getMyProfile: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getChapterKey).mockReturnValue({} as CryptoKey)
  vi.mocked(wrapChapterKeyWithSecret).mockResolvedValue({ encryptedChapterKey: 'enc', keyNonce: 'nonce' })
  vi.mocked(getMyProfile).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Jamie', avatarUrl: null, timezone: 'UTC' })
})

describe('InviteModal', () => {
  it('prefills the inviter name from the current profile', async () => {
    render(<InviteModal chapterId="c1" onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByDisplayValue('Jamie')).toBeInTheDocument())
  })

  it('creates a link invite, copies it, and shows the URL', async () => {
    vi.mocked(createInvite).mockResolvedValue({ inviteURL: 'https://example.com/invite/abc' })
    // user-event installs its own navigator.clipboard stub on setup() — spy on that.
    const user = userEvent.setup()
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<InviteModal chapterId="c1" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Copy Invite Link' }))

    expect(await screen.findByDisplayValue('https://example.com/invite/abc')).toBeInTheDocument()
    expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/invite/abc')
    expect(createInvite).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'c1' }))
  })

  it('shows an error message when creating a link invite fails', async () => {
    vi.mocked(createInvite).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<InviteModal chapterId="c1" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Copy Invite Link' }))
    expect(await screen.findByText('Failed to create invite. Please try again.')).toBeInTheDocument()
  })

  it('switches to the email tab and sends an invite', async () => {
    vi.mocked(createInviteAndEmail).mockResolvedValue({ inviteURL: 'https://example.com/invite/abc' })
    const user = userEvent.setup()
    render(<InviteModal chapterId="c1" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Email Link' }))
    await user.type(screen.getByPlaceholderText('member@example.com'), 'friend@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    expect(await screen.findByText('Invite emailed to friend@example.com.')).toBeInTheDocument()
    expect(createInviteAndEmail).toHaveBeenCalledWith(
      expect.objectContaining({ chapterId: 'c1', invitedEmail: 'friend@example.com' })
    )
  })

  it('shows an error message when sending an email invite fails', async () => {
    vi.mocked(createInviteAndEmail).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<InviteModal chapterId="c1" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Email Link' }))
    await user.type(screen.getByPlaceholderText('member@example.com'), 'friend@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    expect(await screen.findByText('Failed to send invite. Please try again.')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<InviteModal chapterId="c1" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
