import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileSection } from '../ProfileSection'
import type { UserProfile } from '../../../api/types'

const profile: UserProfile = { id: 'u1', email: 'alex@example.com', name: 'Alex', avatarUrl: null, timezone: 'America/Los_Angeles' }

const baseProps = {
  profile,
  email: 'alex@example.com',
  editing: false,
  name: 'Alex',
  timezone: 'America/Los_Angeles',
  emailValue: '',
  passwordValue: '',
  confirmPasswordValue: '',
  error: null,
  saving: false,
  onEditClick: vi.fn(),
  onNameChange: vi.fn(),
  onTimezoneChange: vi.fn(),
  onEmailChange: vi.fn(),
  onPasswordChange: vi.fn(),
  onConfirmPasswordChange: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
}

describe('ProfileSection', () => {
  it('renders the profile in read-only mode', () => {
    render(<ProfileSection {...baseProps} />)
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(screen.getByText('America/Los_Angeles')).toBeInTheDocument()
  })

  it('shows a "Not set" placeholder when there is no name', () => {
    render(<ProfileSection {...baseProps} profile={{ ...profile, name: null }} />)
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('shows the pending email notice when one is present', () => {
    render(<ProfileSection {...baseProps} pendingEmail="new@example.com" />)
    expect(screen.getByText(/Pending: new@example.com/)).toBeInTheDocument()
  })

  it('calls onEditClick from the read-only view', async () => {
    const onEditClick = vi.fn()
    const user = userEvent.setup()
    render(<ProfileSection {...baseProps} onEditClick={onEditClick} />)

    await user.click(screen.getByRole('button', { name: 'Edit profile' }))
    expect(onEditClick).toHaveBeenCalledOnce()
  })

  it('renders an editable form wired to the change handlers', async () => {
    const onNameChange = vi.fn()
    const user = userEvent.setup()
    render(<ProfileSection {...baseProps} editing onNameChange={onNameChange} />)

    await user.type(screen.getByDisplayValue('Alex'), '!')
    expect(onNameChange).toHaveBeenCalled()
  })

  it('shows the error message when present', () => {
    render(<ProfileSection {...baseProps} editing error="Failed to save profile" />)
    expect(screen.getByText('Failed to save profile')).toBeInTheDocument()
  })

  it('disables the save button and shows a saving label while saving', () => {
    render(<ProfileSection {...baseProps} editing saving />)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('calls onSave and onCancel from the edit form', async () => {
    const onSave = vi.fn((e: React.FormEvent) => e.preventDefault())
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ProfileSection {...baseProps} editing onSave={onSave} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
