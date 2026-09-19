import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopicForm } from '../TopicForm'
import type { Theme } from '../../../api/types'

const chapterThemes: Theme[] = [{ id: 't1', chapterId: 'c1', name: 'Sci-Fi', createdAt: '2026-01-01T00:00:00.000Z' }]

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Add a topic…'), 'Dune')
  await user.type(screen.getByPlaceholderText('Add at least one theme'), 'Sci-Fi{Enter}')
}

describe('TopicForm', () => {
  it('renders initial values', () => {
    render(
      <TopicForm
        chapterThemes={chapterThemes}
        initialTitle="Dune"
        initialUrl="https://example.com"
        initialDescription="A sci-fi epic"
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('Dune')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A sci-fi epic')).toBeInTheDocument()
  })

  it('shows a validation error and does not submit when no theme has been added', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TopicForm chapterThemes={chapterThemes} onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('Add a topic…'), 'Dune')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('A topic and theme required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed data and resets fields when there is no onCancel (create mode)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<TopicForm chapterThemes={chapterThemes} onSubmit={onSubmit} />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Dune',
      description: '',
      url: '',
      themes: [{ name: 'Sci-Fi' }],
    })
    expect(screen.queryByDisplayValue('Dune')).not.toBeInTheDocument()
  })

  it('does not reset fields after submit when onCancel is provided (edit mode)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<TopicForm chapterThemes={chapterThemes} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSubmit).toHaveBeenCalled()
    expect(screen.getByDisplayValue('Dune')).toBeInTheDocument()
  })

  it('shows a Cancel button only when onCancel is provided, and calls it', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<TopicForm chapterThemes={chapterThemes} onSubmit={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()

    rerender(<TopicForm chapterThemes={chapterThemes} onSubmit={vi.fn()} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables the submit button and shows the pending label while submitting', () => {
    render(<TopicForm chapterThemes={chapterThemes} onSubmit={vi.fn()} submitLabel="Save" pendingLabel="Saving…" submitting />)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })
})
