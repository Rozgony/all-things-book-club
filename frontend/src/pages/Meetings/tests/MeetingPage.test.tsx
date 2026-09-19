import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingPage } from '../MeetingPage'
import { useAuthStore } from '../../../store/authStore'
import { createTopic, updateTopicStatus, updateTopicContent, deleteTopic } from '../../../api/topics'
import { getThemesByChapterId, linkThemeToTopic, unlinkThemeFromTopic } from '../../../api/themes'
import { updateMeeting, getMeetingById } from '../../../api/meetings'
import { getMyProfile } from '../../../api/users'
import { MeetingStatus, type Meeting, type Topic } from '../../../api/types'

const navigateMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'm1' }),
  useNavigate: () => navigateMock,
}))

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../../components/Nav', () => ({
  Nav: () => <div data-testid="nav" />,
}))

vi.mock('../../../components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}))

vi.mock('../MeetingInfo', () => ({
  MeetingInfo: ({
    meeting,
    onStatusUpdate,
    onEditDateStart,
    onSaveDate,
  }: {
    meeting: Meeting
    onStatusUpdate: () => void
    onEditDateStart: () => void
    onSaveDate: () => void
  }) => (
    <div data-testid="meeting-info">
      <span>status:{meeting.status}</span>
      <button onClick={() => onStatusUpdate()}>Toggle status</button>
      <button onClick={onEditDateStart}>Edit date</button>
      <button onClick={onSaveDate}>Save date</button>
    </div>
  ),
}))

vi.mock('../SpinWheel', () => ({
  SpinWheel: ({ topics, onSpinEnd }: { topics: Topic[]; onSpinEnd: (t: Topic) => void }) => (
    <div data-testid="spin-wheel">
      <span>{topics.filter(t => t.status === 'PENDING').length} pending</span>
      <button onClick={() => onSpinEnd(topics.find(t => t.status === 'PENDING')!)}>Trigger spin end</button>
    </div>
  ),
}))

vi.mock('../TopicModal', () => ({
  TopicModal: ({
    topic,
    onMarkDiscussed,
    onSkip,
  }: {
    topic: Topic | null
    onMarkDiscussed: () => void
    onSkip: () => void
  }) =>
    topic ? (
      <div data-testid="topic-modal">
        <span>selected:{topic.title}</span>
        <button onClick={onMarkDiscussed}>Mark Discussed</button>
        <button onClick={onSkip}>Skip</button>
      </div>
    ) : null,
}))

vi.mock('../TopicForm', () => ({
  TopicForm: ({
    onSubmit,
    initialTitle,
    submitLabel,
  }: {
    onSubmit: (data: { title: string; description: string; url: string; themes: { name: string }[] }) => void
    initialTitle?: string
    submitLabel?: string
  }) => (
    <div data-testid={`topic-form-${submitLabel}`}>
      <button
        onClick={() => onSubmit({ title: initialTitle || 'New Topic', description: '', url: '', themes: [{ name: 'NewTheme' }] })}
      >
        Submit {submitLabel}
      </button>
    </div>
  ),
}))

vi.mock('../TopicCard', () => ({
  TopicCard: ({
    topic,
    onEdit,
    onDelete,
  }: {
    topic: Topic
    onEdit: (t: Topic) => void
    onDelete: (id: string) => void
  }) => (
    <div>
      <span>card:{topic.title}</span>
      <button onClick={() => onEdit(topic)}>Edit {topic.title}</button>
      <button onClick={() => onDelete(topic.id)}>Delete {topic.title}</button>
    </div>
  ),
}))

vi.mock('../../../api/topics', () => ({
  createTopic: vi.fn(),
  updateTopicStatus: vi.fn(),
  updateTopicContent: vi.fn(),
  deleteTopic: vi.fn(),
}))

vi.mock('../../../api/themes', () => ({
  getThemesByChapterId: vi.fn(),
  linkThemeToTopic: vi.fn(),
  unlinkThemeFromTopic: vi.fn(),
}))

vi.mock('../../../api/meetings', () => ({
  updateMeeting: vi.fn(),
  getMeetingById: vi.fn(),
}))

vi.mock('../../../api/users', () => ({
  getMyProfile: vi.fn(),
}))

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    chapterId: 'c1',
    scheduledAt: '2026-10-01T18:00:00.000Z',
    duration: 60,
    status: MeetingStatus.ACTIVE,
    recurringGroupId: null,
    topics: [
      { id: 't1', chapterId: 'c1', createdById: null, status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z', title: 'Topic One', description: null },
      { id: 't2', chapterId: 'c1', createdById: null, status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z', title: 'Topic Two', description: null },
    ],
    ...overrides,
  }
}

describe('MeetingPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({ timezone: null } as never))
    vi.mocked(getMyProfile).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Alex', avatarUrl: null, timezone: 'UTC' })
    vi.mocked(getThemesByChapterId).mockResolvedValue([])
    vi.mocked(linkThemeToTopic).mockResolvedValue({ themeId: 'new-theme-1', createdAt: '2026-01-01T00:00:00.000Z' })
    vi.mocked(unlinkThemeFromTopic).mockResolvedValue(undefined)
    vi.mocked(updateMeeting).mockResolvedValue(makeMeeting())
  })

  it('shows a loading state while the meeting is loading', () => {
    vi.mocked(getMeetingById).mockReturnValue(new Promise(() => {}))
    render(<MeetingPage />)
    expect(screen.getByText('Loading Meeting…')).toBeInTheDocument()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('shows an error state when loading the meeting fails, and navigates back', async () => {
    vi.mocked(getMeetingById).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<MeetingPage />)

    expect(await screen.findByText('Failed to load meeting')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Go back' }))
    expect(navigateMock).toHaveBeenCalledWith(-1)
  })

  it('renders meeting info, the spin wheel, and pending topics once loaded', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting())
    render(<MeetingPage />)

    expect(await screen.findByTestId('meeting-info')).toHaveTextContent('status:ACTIVE')
    expect(screen.getByTestId('spin-wheel')).toHaveTextContent('2 pending')
    expect(screen.getByText('card:Topic One')).toBeInTheDocument()
  })

  it('adds a new topic and links its new theme', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting({ topics: [] }))
    vi.mocked(createTopic).mockResolvedValue({
      id: 't3', chapterId: 'c1', createdById: null, status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z', title: 'New Topic', description: null,
    })
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Submit Add' }))

    await waitFor(() => expect(createTopic).toHaveBeenCalledWith('c1', 'm1', 'New Topic', undefined, ''))
    expect(linkThemeToTopic).toHaveBeenCalledWith('t3', 'c1', { name: 'NewTheme' })
    expect(await screen.findByText('card:New Topic')).toBeInTheDocument()
  })

  it('edits an existing topic and reconciles its themes', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting())
    vi.mocked(updateTopicContent).mockResolvedValue({
      id: 't1', chapterId: 'c1', createdById: null, status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z', title: 'Topic One', description: null,
    })
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit Topic One' }))
    await user.click(screen.getByRole('button', { name: 'Submit Save' }))

    await waitFor(() => expect(updateTopicContent).toHaveBeenCalledWith('t1', 'c1', '2026-01-01T00:00:00.000Z', 'Topic One', undefined, undefined))
    expect(linkThemeToTopic).toHaveBeenCalledWith('t1', 'c1', { name: 'NewTheme' })
    // Editing form closes and the card view returns.
    expect(await screen.findByText('card:Topic One')).toBeInTheDocument()
  })

  it('deletes a topic', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting())
    vi.mocked(deleteTopic).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete Topic One' }))

    await waitFor(() => expect(deleteTopic).toHaveBeenCalledWith('t1'))
    expect(screen.queryByText('card:Topic One')).not.toBeInTheDocument()
  })

  it('selects a topic when the spin ends', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting())
    vi.mocked(updateTopicStatus).mockResolvedValue({
      id: 't1', chapterId: 'c1', createdById: null, status: 'SELECTED', createdAt: '2026-01-01T00:00:00.000Z', title: 'Topic One', description: null,
    })
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Trigger spin end' }))

    expect(await screen.findByTestId('topic-modal')).toHaveTextContent('selected:Topic One')
    expect(updateTopicStatus).toHaveBeenCalledWith('t1', expect.objectContaining({ id: 't1' }), 'SELECTED')
  })

  it('marks the selected topic as discussed and moves it to the discussed list', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting())
    vi.mocked(updateTopicStatus).mockResolvedValue({
      id: 't1', chapterId: 'c1', createdById: null, status: 'DISCUSSED', createdAt: '2026-01-01T00:00:00.000Z', title: 'Topic One', description: null,
    })
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Trigger spin end' }))
    await screen.findByTestId('topic-modal')
    await user.click(screen.getByRole('button', { name: 'Mark Discussed' }))

    await waitFor(() => expect(updateTopicStatus).toHaveBeenCalledWith('t1', expect.objectContaining({ id: 't1' }), 'DISCUSSED'))
    expect(screen.queryByTestId('topic-modal')).not.toBeInTheDocument()
    expect(screen.getByText('Topic One')).toBeInTheDocument()
  })

  it('skips the selected topic and closes the modal', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting())
    vi.mocked(updateTopicStatus).mockResolvedValue({
      id: 't1', chapterId: 'c1', createdById: null, status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z', title: 'Topic One', description: null,
    })
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Trigger spin end' }))
    await screen.findByTestId('topic-modal')
    await user.click(screen.getByRole('button', { name: 'Skip' }))

    await waitFor(() => expect(updateTopicStatus).toHaveBeenCalledWith('t1', expect.objectContaining({ id: 't1' }), 'PENDING'))
    expect(screen.queryByTestId('topic-modal')).not.toBeInTheDocument()
  })

  it('updates meeting status via MeetingInfo', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting({ status: MeetingStatus.ACTIVE }))
    vi.mocked(updateMeeting).mockResolvedValue(makeMeeting({ status: MeetingStatus.COMPLETED }))
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Toggle status' }))

    await waitFor(() => expect(updateMeeting).toHaveBeenCalledWith('m1', { status: MeetingStatus.COMPLETED }))
    expect(await screen.findByTestId('meeting-info')).toHaveTextContent('status:COMPLETED')
  })

  it('saves the meeting date via MeetingInfo', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting())
    vi.mocked(updateMeeting).mockResolvedValue(makeMeeting({ scheduledAt: '2026-11-01T18:00:00.000Z' }))
    const user = userEvent.setup()
    render(<MeetingPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit date' }))
    await user.click(screen.getByRole('button', { name: 'Save date' }))

    await waitFor(() => expect(updateMeeting).toHaveBeenCalledWith('m1', expect.objectContaining({ chapterId: 'c1' })))
  })

  it('saves discussion notes when the textarea loses focus', async () => {
    vi.mocked(getMeetingById).mockResolvedValue(makeMeeting({ discussionNotes: '' }))
    const user = userEvent.setup()
    render(<MeetingPage />)

    const textarea = await screen.findByPlaceholderText('Notes from the discussion…')
    await user.type(textarea, 'Great discussion')
    await user.tab()

    await waitFor(() =>
      expect(updateMeeting).toHaveBeenCalledWith('m1', { discussionNotes: 'Great discussion', chapterId: 'c1' })
    )
  })
})
