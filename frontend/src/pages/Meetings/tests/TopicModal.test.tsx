import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopicModal } from '../TopicModal'
import type { Topic, Theme } from '../../../api/types'

const chapterThemes: Theme[] = [{ id: 't1', chapterId: 'c1', name: 'Sci-Fi', createdAt: '2026-01-01T00:00:00.000Z' }]

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-1',
    chapterId: 'c1',
    createdById: null,
    status: 'SELECTED',
    createdAt: '2026-01-01T00:00:00.000Z',
    title: 'Dune',
    description: 'A sci-fi epic.',
    ...overrides,
  }
}

describe('TopicModal', () => {
  it('renders nothing when there is no topic', () => {
    const { container } = render(
      <TopicModal topic={null} onMarkDiscussed={vi.fn()} onSkip={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the topic title, description, and theme tags', () => {
    render(
      <TopicModal topic={makeTopic({ themeIds: ['t1'] })} chapterThemes={chapterThemes} onMarkDiscussed={vi.fn()} onSkip={vi.fn()} />
    )
    expect(screen.getByText('Dune')).toBeInTheDocument()
    expect(screen.getByText('A sci-fi epic.')).toBeInTheDocument()
    expect(screen.getByText('#Sci-Fi')).toBeInTheDocument()
  })

  it('renders the title as a link when a url is present', () => {
    render(<TopicModal topic={makeTopic({ url: 'https://example.com' })} onMarkDiscussed={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Dune' })).toHaveAttribute('href', 'https://example.com')
  })

  it('calls onMarkDiscussed and onSkip in the default (non-read-only) mode', async () => {
    const onMarkDiscussed = vi.fn()
    const onSkip = vi.fn()
    const user = userEvent.setup()
    render(<TopicModal topic={makeTopic()} onMarkDiscussed={onMarkDiscussed} onSkip={onSkip} />)

    await user.click(screen.getByRole('button', { name: 'Mark Discussed' }))
    expect(onMarkDiscussed).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('shows a single Close button and calls onClose in read-only mode', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<TopicModal topic={makeTopic()} onMarkDiscussed={vi.fn()} onSkip={vi.fn()} onClose={onClose} readOnly />)

    expect(screen.queryByRole('button', { name: 'Mark Discussed' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
