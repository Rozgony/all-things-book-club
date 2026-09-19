import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateChapterForm } from '../CreateChapterForm'
import { createChapter } from '../../../api/chapters'
import { useAuthStore } from '../../../store/authStore'
import type { Chapter } from '../../../api/types'

vi.mock('../../../api/chapters', () => ({
  createChapter: vi.fn(),
}))

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

function mockUser(user: unknown) {
  vi.mocked(useAuthStore).mockImplementation((selector) => selector({ user } as never))
}

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
    description: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('CreateChapterForm', () => {
  beforeEach(() => {
    mockUser({ email: 'alex@example.com', user_metadata: {} })
    vi.mocked(createChapter).mockResolvedValue(makeChapter())
  })

  it('creates a chapter with the entered fields and resets the form', async () => {
    const onChapterCreated = vi.fn()
    const user = userEvent.setup()
    render(<CreateChapterForm onChapterCreated={onChapterCreated} onCancel={vi.fn()} />)

    await user.type(screen.getAllByRole('textbox')[0], 'Sci-Fi Book Club')
    await user.click(screen.getByRole('button', { name: 'Create Chapter' }))

    expect(createChapter).toHaveBeenCalledWith({
      name: 'Sci-Fi Book Club',
      description: undefined,
      creatorName: 'alex@example.com',
    })
    expect(onChapterCreated).toHaveBeenCalled()
    expect(await screen.findByPlaceholderText('How members will see you')).toHaveValue('')
  })

  it('falls back to the display name when provided', async () => {
    const user = userEvent.setup()
    render(<CreateChapterForm onChapterCreated={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('How members will see you'), 'Alex')
    const nameInputs = screen.getAllByRole('textbox')
    await user.type(nameInputs[0], 'Sci-Fi Book Club')
    await user.click(screen.getByRole('button', { name: 'Create Chapter' }))

    expect(createChapter).toHaveBeenCalledWith(expect.objectContaining({ creatorName: 'Alex' }))
  })

  it('shows an error message when creation fails', async () => {
    vi.mocked(createChapter).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<CreateChapterForm onChapterCreated={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getAllByRole('textbox')[0], 'Sci-Fi Book Club')
    await user.click(screen.getByRole('button', { name: 'Create Chapter' }))

    expect(await screen.findByText('Failed to create chapter')).toBeInTheDocument()
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<CreateChapterForm onChapterCreated={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables the submit button and shows a creating label while submitting', async () => {
    let resolveCreate: (chapter: Chapter) => void = () => {}
    vi.mocked(createChapter).mockReturnValue(new Promise(resolve => { resolveCreate = resolve }))
    const user = userEvent.setup()
    render(<CreateChapterForm onChapterCreated={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getAllByRole('textbox')[0], 'Sci-Fi Book Club')
    await user.click(screen.getByRole('button', { name: 'Create Chapter' }))

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
    resolveCreate(makeChapter())
  })
})
