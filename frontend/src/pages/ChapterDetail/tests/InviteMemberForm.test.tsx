import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteMemberForm } from '../InviteMemberForm'

vi.mock('../../../components/InviteModal', () => ({
  InviteModal: ({ chapterId, onClose }: { chapterId: string; onClose: () => void }) => (
    <div data-testid="invite-modal">
      Invite modal for {chapterId}
      <button onClick={onClose}>Close modal</button>
    </div>
  ),
}))

describe('InviteMemberForm', () => {
  it('does not show the invite modal initially', () => {
    render(<InviteMemberForm chapterId="c1" />)
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
  })

  it('opens the invite modal with the chapter id when clicked', async () => {
    const user = userEvent.setup()
    render(<InviteMemberForm chapterId="c1" />)

    await user.click(screen.getByRole('button', { name: '+ Invite a member' }))
    expect(screen.getByTestId('invite-modal')).toHaveTextContent('Invite modal for c1')
  })

  it('closes the invite modal when it requests to close', async () => {
    const user = userEvent.setup()
    render(<InviteMemberForm chapterId="c1" />)

    await user.click(screen.getByRole('button', { name: '+ Invite a member' }))
    await user.click(screen.getByRole('button', { name: 'Close modal' }))
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
  })
})
