import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChapterDetailPage } from '../ChapterDetailPage'
import { useAuthStore } from '../../../store/authStore'
import { getChapterAndSetKey, deleteChapter } from '../../../api/chapters'
import { getMeetingsByChapterId } from '../../../api/meetings'
import { updateMemberName } from '../../../api/members'
import { getMyProfile } from '../../../api/users'
import type { Chapter } from '../../../api/types'
import { MeetingStatus } from '../../../api/types'

const navigateMock = vi.fn()
let searchParamsValue = new URLSearchParams()
const setSearchParamsMock = vi.fn((next: Record<string, string>) => {
  searchParamsValue = new URLSearchParams(next)
})

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'c1' }),
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParamsValue, setSearchParamsMock],
}))

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../../components/Nav', () => ({
  Nav: () => <div data-testid="nav" />,
}))

vi.mock('../ChapterHeader', () => ({
  ChapterHeader: ({ chapter, isAdmin }: { chapter: Partial<Chapter>; isAdmin: boolean }) => (
    <div data-testid="chapter-header">
      <span>{chapter.name}</span>
      <span>{isAdmin ? 'admin' : 'not-admin'}</span>
    </div>
  ),
}))

vi.mock('../MeetingsList', () => ({
  MeetingsList: ({ meetings, loading }: { meetings: unknown[]; loading: boolean }) => (
    <div data-testid="meetings-list">{loading ? 'loading meetings' : `${meetings.length} meetings`}</div>
  ),
}))

vi.mock('../../../components/MemberNameModal', () => ({
  MemberNameModal: ({
    isOpen,
    initialName,
    onSave,
    onCancel,
  }: {
    isOpen: boolean
    initialName: string
    onSave: (name: string) => void
    onCancel?: () => void
  }) =>
    isOpen ? (
      <div data-testid="member-name-modal">
        <span>{initialName}</span>
        <button onClick={() => onSave('New Name')}>Save name</button>
        <button onClick={onCancel}>Cancel name</button>
      </div>
    ) : null,
}))

vi.mock('../../../components/ConfirmModal', () => ({
  ConfirmModal: ({
    header,
    onConfirm,
    onCancel,
  }: {
    header: string
    onConfirm: () => void
    onCancel: () => void
  }) => (
    <div data-testid="confirm-modal">
      <span>{header}</span>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('../../../components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}))

vi.mock('../../../api/chapters', () => ({
  getChapterAndSetKey: vi.fn(),
  updateChapter: vi.fn(),
  deleteChapter: vi.fn(),
}))

vi.mock('../../../api/meetings', () => ({
  getMeetingsByChapterId: vi.fn(),
}))

vi.mock('../../../api/members', () => ({
  updateMemberName: vi.fn(),
}))

vi.mock('../../../api/users', () => ({
  getMyProfile: vi.fn(),
}))

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1',
    creatorId: 'user-1',
    isPublic: false,
    encryptedBlob: null,
    nonce: null,
    encryptedChapterKey: null,
    keyNonce: null,
    name: 'Sci-Fi Book Club',
    description: 'We read sci-fi.',
    createdAt: '2026-01-01T00:00:00.000Z',
    chapterMembers: [
      { id: 'member-1', userId: 'user-1', chapterId: 'c1', role: 'ADMIN', name: 'Alex' },
    ],
    ...overrides,
  }
}

function mockUser(id: string) {
  vi.mocked(useAuthStore).mockImplementation((selector) =>
    selector({ user: { id, email: 'alex@example.com', user_metadata: { name: 'Alex' } } } as never)
  )
}

describe('ChapterDetailPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    setSearchParamsMock.mockClear()
    searchParamsValue = new URLSearchParams()
    vi.mocked(getMyProfile).mockResolvedValue({ id: 'user-1', email: 'alex@example.com', name: 'Alex', avatarUrl: null, timezone: 'UTC' })
    vi.mocked(getMeetingsByChapterId).mockResolvedValue([])
    mockUser('user-1')
  })

  it('shows a loading spinner while the chapter is loading', () => {
    vi.mocked(getChapterAndSetKey).mockReturnValue(new Promise(() => {}))
    render(<ChapterDetailPage />)
    expect(screen.getByText('Loading chapter…')).toBeInTheDocument()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('shows an error state when loading the chapter fails', async () => {
    vi.mocked(getChapterAndSetKey).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<ChapterDetailPage />)

    expect(await screen.findByText('Failed to load chapter')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to my profile' }))
    expect(navigateMock).toHaveBeenCalledWith('/profile')
  })

  it('renders the chapter header and meetings list once loaded', async () => {
    vi.mocked(getChapterAndSetKey).mockResolvedValue(makeChapter())
    vi.mocked(getMeetingsByChapterId).mockResolvedValue([
      { id: 'm1', chapterId: 'c1', scheduledAt: '2026-10-01T00:00:00.000Z', duration: 30, status: MeetingStatus.SCHEDULED, recurringGroupId: null },
    ])
    render(<ChapterDetailPage />)

    expect(await screen.findByText('Sci-Fi Book Club')).toBeInTheDocument()
    expect(screen.getByTestId('meetings-list')).toHaveTextContent('1 meetings')
  })

  it('marks the current user as admin when they hold the ADMIN role', async () => {
    vi.mocked(getChapterAndSetKey).mockResolvedValue(makeChapter())
    render(<ChapterDetailPage />)
    expect(await screen.findByTestId('chapter-header')).toHaveTextContent('admin')
  })

  it('marks the current user as not-admin when they only hold the MEMBER role', async () => {
    mockUser('user-2')
    vi.mocked(getChapterAndSetKey).mockResolvedValue(
      makeChapter({
        chapterMembers: [
          { id: 'member-1', userId: 'user-1', chapterId: 'c1', role: 'ADMIN', name: 'Alex' },
          { id: 'member-2', userId: 'user-2', chapterId: 'c1', role: 'MEMBER', name: 'Jamie' },
        ],
      })
    )
    render(<ChapterDetailPage />)
    expect(await screen.findByText('not-admin')).toBeInTheDocument()
  })

  it('shows the danger zone only for the chapter creator', async () => {
    vi.mocked(getChapterAndSetKey).mockResolvedValue(makeChapter({ creatorId: 'user-1' }))
    render(<ChapterDetailPage />)
    expect(await screen.findByText('Danger Zone')).toBeInTheDocument()
  })

  it('hides the danger zone for non-creators', async () => {
    mockUser('user-2')
    vi.mocked(getChapterAndSetKey).mockResolvedValue(
      makeChapter({
        creatorId: 'user-1',
        chapterMembers: [{ id: 'member-2', userId: 'user-2', chapterId: 'c1', role: 'MEMBER', name: 'Jamie' }],
      })
    )
    render(<ChapterDetailPage />)
    await screen.findByTestId('chapter-header')
    expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument()
  })

  it('deletes the chapter and navigates away on confirm', async () => {
    vi.mocked(getChapterAndSetKey).mockResolvedValue(makeChapter())
    vi.mocked(deleteChapter).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ChapterDetailPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete Chapter' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(deleteChapter).toHaveBeenCalledWith('c1'))
    expect(navigateMock).toHaveBeenCalledWith('/profile')
  })

  it('auto-opens the member name modal when navigating with ?setName=true', async () => {
    vi.mocked(getChapterAndSetKey).mockResolvedValue(makeChapter())
    searchParamsValue = new URLSearchParams({ setName: 'true' })
    render(<ChapterDetailPage />)

    expect(await screen.findByTestId('member-name-modal')).toBeInTheDocument()
    expect(setSearchParamsMock).toHaveBeenCalledWith({})
  })

  it('saves an edited member name and reloads the chapter', async () => {
    vi.mocked(getChapterAndSetKey).mockResolvedValue(makeChapter())
    vi.mocked(updateMemberName).mockResolvedValue({ id: 'member-1', userId: 'user-1', chapterId: 'c1', role: 'ADMIN', name: 'New Name' })
    const user = userEvent.setup()
    render(<ChapterDetailPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    await waitFor(() => expect(updateMemberName).toHaveBeenCalledWith('member-1', 'c1', 'New Name', null, null))
    expect(getChapterAndSetKey).toHaveBeenCalledTimes(2)
  })
})
