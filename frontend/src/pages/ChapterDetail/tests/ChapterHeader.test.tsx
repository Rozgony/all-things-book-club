import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChapterHeader } from '../ChapterHeader'

const baseProps = {
  chapter: { name: 'Sci-Fi Book Club', description: 'We read sci-fi.' },
  editing: false,
  editName: 'Sci-Fi Book Club',
  editDescription: 'We read sci-fi.',
  editError: null,
  saving: false,
  deleting: false,
  isAdmin: false,
  onEdit: vi.fn(),
  onEditNameChange: vi.fn(),
  onEditDescriptionChange: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
}

describe('ChapterHeader', () => {
  it('renders the chapter name and description in read-only mode', () => {
    render(<ChapterHeader {...baseProps} />)
    expect(screen.getByText('Sci-Fi Book Club')).toBeInTheDocument()
    expect(screen.getByText('We read sci-fi.')).toBeInTheDocument()
  })

  it('hides the Edit button for non-admins', () => {
    render(<ChapterHeader {...baseProps} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('shows the Edit button for admins and calls onEdit when clicked', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(<ChapterHeader {...baseProps} isAdmin onEdit={onEdit} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('renders an editable form when editing, wired to the change handlers', async () => {
    const onEditNameChange = vi.fn()
    const user = userEvent.setup()
    render(<ChapterHeader {...baseProps} editing onEditNameChange={onEditNameChange} />)

    expect(screen.getByText('Edit Chapter')).toBeInTheDocument()
    const nameInput = screen.getByDisplayValue('Sci-Fi Book Club')
    await user.type(nameInput, '!')
    expect(onEditNameChange).toHaveBeenCalled()
  })

  it('shows the edit error message when present', () => {
    render(<ChapterHeader {...baseProps} editing editError="Failed to update chapter" />)
    expect(screen.getByText('Failed to update chapter')).toBeInTheDocument()
  })

  it('disables the save button and shows a saving label while saving', () => {
    render(<ChapterHeader {...baseProps} editing saving />)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('calls onSave and onCancel from the edit form', async () => {
    const onSave = vi.fn((e: React.FormEvent) => e.preventDefault())
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ChapterHeader {...baseProps} editing onSave={onSave} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
