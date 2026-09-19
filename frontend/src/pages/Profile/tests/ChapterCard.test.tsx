import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChapterCard } from '../ChapterCard'
import type { Chapter } from '../../../api/types'

const navigateMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1',
    creatorId: 'u1',
    isPublic: false,
    encryptedBlob: null,
    nonce: null,
    encryptedChapterKey: null,
    keyNonce: null,
    name: 'Sci-Fi Book Club',
    description: 'We read sci-fi.',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ChapterCard', () => {
  it('renders the chapter name and description', () => {
    render(<ChapterCard chapter={makeChapter()} bgColor="white" />)
    expect(screen.getByText('Sci-Fi Book Club')).toBeInTheDocument()
    expect(screen.getByText('We read sci-fi.')).toBeInTheDocument()
  })

  it('omits the description paragraph when there is none', () => {
    render(<ChapterCard chapter={makeChapter({ description: null })} bgColor="white" />)
    expect(screen.queryByText('We read sci-fi.')).not.toBeInTheDocument()
  })

  it('navigates to the chapter detail page when clicked', async () => {
    const user = userEvent.setup()
    render(<ChapterCard chapter={makeChapter({ id: 'c42' })} bgColor="white" />)

    await user.click(screen.getByRole('button'))
    expect(navigateMock).toHaveBeenCalledWith('/chapters/c42')
  })
})
