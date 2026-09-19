import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingsList } from '../MeetingsList'
import { MeetingStatus, type Meeting } from '../../../api/types'

vi.mock('../MeetingCard', () => ({
  MeetingCard: ({ meeting }: { meeting: Meeting }) => <li>Meeting card {meeting.id}</li>,
}))

vi.mock('../InviteMemberForm', () => ({
  InviteMemberForm: ({ chapterId }: { chapterId: string }) => <div>Invite form {chapterId}</div>,
}))

vi.mock('../ScheduleMeetingForm', () => ({
  ScheduleMeetingForm: ({ editRuleId }: { editRuleId?: string }) => (
    <div>Schedule form {editRuleId ? `(editing ${editRuleId})` : '(new)'}</div>
  ),
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

describe('MeetingsList', () => {
  it('shows a loading message while loading', () => {
    render(<MeetingsList chapterId="c1" meetings={[]} loading onMeetingCreated={vi.fn()} />)
    expect(screen.getByText('Loading meetings…')).toBeInTheDocument()
  })

  it('shows an empty state when there are no upcoming meetings', () => {
    render(<MeetingsList chapterId="c1" meetings={[]} loading={false} onMeetingCreated={vi.fn()} />)
    expect(screen.getByText('No upcoming meetings scheduled')).toBeInTheDocument()
  })

  it('lists scheduled/active meetings under the Upcoming tab', () => {
    const meetings = [
      makeMeeting({ id: 'm1', status: MeetingStatus.SCHEDULED }),
      makeMeeting({ id: 'm2', status: MeetingStatus.COMPLETED }),
    ]
    render(<MeetingsList chapterId="c1" meetings={meetings} loading={false} onMeetingCreated={vi.fn()} />)

    expect(screen.getByText('Meeting card m1')).toBeInTheDocument()
    expect(screen.queryByText('Meeting card m2')).not.toBeInTheDocument()
  })

  it('switches to the Past tab and shows completed/cancelled meetings', async () => {
    const meetings = [
      makeMeeting({ id: 'm1', status: MeetingStatus.SCHEDULED }),
      makeMeeting({ id: 'm2', status: MeetingStatus.COMPLETED }),
    ]
    const user = userEvent.setup()
    render(<MeetingsList chapterId="c1" meetings={meetings} loading={false} onMeetingCreated={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Past' }))
    expect(screen.getByText('Meeting card m2')).toBeInTheDocument()
    expect(screen.queryByText('Meeting card m1')).not.toBeInTheDocument()
  })

  it('shows the schedule form when the schedule button is clicked', async () => {
    const user = userEvent.setup()
    render(<MeetingsList chapterId="c1" meetings={[]} loading={false} onMeetingCreated={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '+ Schedule Meeting' }))
    expect(screen.getByText('Schedule form (new)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Schedule Meeting' })).not.toBeInTheDocument()
  })

  it('shows a Manage Recurring button only when a meeting has a recurring group, and opens the edit form', async () => {
    const meetings = [makeMeeting({ id: 'm1', recurringGroupId: 'rule-1' })]
    const user = userEvent.setup()
    render(<MeetingsList chapterId="c1" meetings={meetings} loading={false} onMeetingCreated={vi.fn()} />)

    const manageButton = screen.getByRole('button', { name: 'Manage Recurring' })
    await user.click(manageButton)
    expect(screen.getByText('Schedule form (editing rule-1)')).toBeInTheDocument()
  })
})
