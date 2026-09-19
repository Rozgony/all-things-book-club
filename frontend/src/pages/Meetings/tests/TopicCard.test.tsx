import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopicCard } from '../TopicCard'
import type { Topic, Theme } from '../../../api/types'

const chapterThemes: Theme[] = [{ id: 't1', chapterId: 'c1', name: 'Sci-Fi', createdAt: '2026-01-01T00:00:00.000Z' }]

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-1',
    chapterId: 'c1',
    createdById: null,
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00.000Z',
    title: 'Dune',
    description: null,
    ...overrides,
  }
}

describe('TopicCard', () => {
  it('renders the title as plain text when there is no url', () => {
    render(<TopicCard topic={makeTopic()} chapterThemes={chapterThemes} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Dune')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders the title as a link when a url is present', () => {
    render(<TopicCard topic={makeTopic({ url: 'https://example.com' })} chapterThemes={chapterThemes} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Dune' })).toHaveAttribute('href', 'https://example.com')
  })

  it('truncates long descriptions', () => {
    const longDescription = 'a'.repeat(150)
    render(<TopicCard topic={makeTopic({ description: longDescription })} chapterThemes={chapterThemes} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(`${'a'.repeat(120)}…`)).toBeInTheDocument()
  })

  it('renders theme tags for linked themes', () => {
    render(<TopicCard topic={makeTopic({ themeIds: ['t1'] })} chapterThemes={chapterThemes} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('#Sci-Fi')).toBeInTheDocument()
  })

  it('calls onEdit and onDelete', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const user = userEvent.setup()
    const topic = makeTopic()
    render(<TopicCard topic={topic} chapterThemes={chapterThemes} onEdit={onEdit} onDelete={onDelete} />)

    await user.click(screen.getByTitle('Edit topic'))
    expect(onEdit).toHaveBeenCalledWith(topic)

    await user.click(screen.getByText('remove'))
    expect(onDelete).toHaveBeenCalledWith('topic-1')
  })
})
