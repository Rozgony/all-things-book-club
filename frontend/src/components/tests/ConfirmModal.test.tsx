import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from '../ConfirmModal'

describe('ConfirmModal', () => {
  it('renders the header and body text', () => {
    render(
      <ConfirmModal header="Delete chapter?" bodyText="This cannot be undone." onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    expect(screen.getByText('Delete chapter?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmModal header="Header" bodyText="Body" onConfirm={onConfirm} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmModal header="Header" bodyText="Body" onConfirm={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables the confirm button and shows an ellipsis while confirming', () => {
    render(
      <ConfirmModal header="Header" bodyText="Body" confirmText="Delete" confirming onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    const button = screen.getByRole('button', { name: 'Delete…' })
    expect(button).toBeDisabled()
  })

  it('uses custom confirm/cancel labels when provided', () => {
    render(
      <ConfirmModal header="Header" bodyText="Body" confirmText="Delete" cancelText="Nevermind" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nevermind' })).toBeInTheDocument()
  })
})
