import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingCard } from '../MeetingCard'
import { deleteMeeting } from '../../../api/meetings'
import { useAuthStore } from '../../../store/authStore'
import { MeetingStatus, type Meeting } from '../../../api/types'

const navigateMock = vi.fn()

vi.mock('../../../api/meetings', () => ({
  deleteMeeting: vi.fn(),
}))

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    chapterId: 'c1',
    scheduledAt: '2026-10-01T18:00:00.000Z',
    duration: 60,
    status: MeetingStatus.SCHEDULED,
    recurringGroupId: null,
    ...overrides,
  }
}

describe('MeetingCard', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({ timezone: null } as never))
    vi.mocked(deleteMeeting).mockResolvedValue(undefined)
  })

  it('renders the duration and status badge', () => {
    render(<MeetingCard meeting={makeMeeting()} />)
    expect(screen.getByText('60 minutes')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('navigates to the meeting page when clicked', async () => {
    const user = userEvent.setup()
    render(<MeetingCard meeting={makeMeeting({ id: 'm42' })} />)

    await user.click(screen.getByText('60 minutes'))
    expect(navigateMock).toHaveBeenCalledWith('/meetings/m42')
  })

  it('shows a delete button only for scheduled meetings', () => {
    const { rerender } = render(<MeetingCard meeting={makeMeeting({ status: MeetingStatus.SCHEDULED })} />)
    expect(screen.getByTitle('Delete meeting')).toBeInTheDocument()

    rerender(<MeetingCard meeting={makeMeeting({ status: MeetingStatus.COMPLETED })} />)
    expect(screen.queryByTitle('Delete meeting')).not.toBeInTheDocument()
  })

  it('opens a confirm dialog without navigating when delete is clicked', async () => {
    const user = userEvent.setup()
    render(<MeetingCard meeting={makeMeeting()} />)

    await user.click(screen.getByTitle('Delete meeting'))
    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.getByText('Delete meeting?')).toBeInTheDocument()
  })

  it('deletes the meeting and calls onDeleted on confirm', async () => {
    const onDeleted = vi.fn()
    const user = userEvent.setup()
    render(<MeetingCard meeting={makeMeeting({ id: 'm7' })} onDeleted={onDeleted} />)

    await user.click(screen.getByTitle('Delete meeting'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(deleteMeeting).toHaveBeenCalledWith('m7')
    expect(onDeleted).toHaveBeenCalledWith('m7')
  })
})
