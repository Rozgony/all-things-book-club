import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleMeetingForm } from '../ScheduleMeetingForm'
import { createMeeting, createRecurringRule, getRecurringRule, updateRecurringRule } from '../../../api/meetings'
import { MeetingFrequency, MeetingStatus, type Meeting, type RecurringRule } from '../../../api/types'

vi.mock('../../../api/meetings', () => ({
  createMeeting: vi.fn(),
  createRecurringRule: vi.fn(),
  getRecurringRule: vi.fn(),
  updateRecurringRule: vi.fn(),
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

function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'rule-1',
    chapterId: 'c1',
    frequency: MeetingFrequency.WEEKLY,
    interval: 2,
    startDate: '2026-10-01T18:00:00.000Z',
    endDate: null,
    duration: 45,
    ...overrides,
  }
}

describe('ScheduleMeetingForm', () => {
  beforeEach(() => {
    vi.mocked(createMeeting).mockResolvedValue(makeMeeting())
    vi.mocked(createRecurringRule).mockResolvedValue(makeMeeting())
    vi.mocked(updateRecurringRule).mockResolvedValue(makeRule())
  })

  it('renders a one-time meeting form by default', () => {
    render(<ScheduleMeetingForm chapterId="c1" onCancel={vi.fn()} />)
    expect(screen.getByText('Date & Time')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.queryByText('End Date (optional)')).not.toBeInTheDocument()
  })

  it('shows recurrence fields when the recurring toggle is switched on', async () => {
    const user = userEvent.setup()
    render(<ScheduleMeetingForm chapterId="c1" onCancel={vi.fn()} />)

    await user.click(screen.getByRole('switch'))
    expect(screen.getByText('End Date (optional)')).toBeInTheDocument()
  })

  it('creates a one-time meeting and notifies the caller', async () => {
    const onMeetingCreated = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ScheduleMeetingForm chapterId="c1" onMeetingCreated={onMeetingCreated} onCancel={onCancel} />)

    const dateInput = document.querySelector('input[type="datetime-local"]')!
    await user.type(dateInput, '2026-11-01T18:00')
    await user.click(screen.getByRole('button', { name: 'Schedule' }))

    await waitFor(() => expect(createMeeting).toHaveBeenCalled())
    expect(createMeeting).toHaveBeenCalledWith('c1', '2026-11-01T18:00', 60, undefined, undefined)
    expect(onMeetingCreated).toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('creates a recurring rule when the toggle is enabled', async () => {
    const user = userEvent.setup()
    render(<ScheduleMeetingForm chapterId="c1" onCancel={vi.fn()} />)

    await user.click(screen.getByRole('switch'))
    const dateInput = document.querySelector('input[type="datetime-local"]')!
    await user.type(dateInput, '2026-11-01T18:00')
    await user.click(screen.getByRole('button', { name: 'Schedule' }))

    await waitFor(() => expect(createRecurringRule).toHaveBeenCalled())
  })

  it('shows an error message when scheduling fails', async () => {
    vi.mocked(createMeeting).mockRejectedValue(new Error('Server exploded'))
    const user = userEvent.setup()
    render(<ScheduleMeetingForm chapterId="c1" onCancel={vi.fn()} />)

    const dateInput = document.querySelector('input[type="datetime-local"]')!
    await user.type(dateInput, '2026-11-01T18:00')
    await user.click(screen.getByRole('button', { name: 'Schedule' }))

    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
  })

  it('loads an existing recurring rule for editing and submits an update', async () => {
    vi.mocked(getRecurringRule).mockResolvedValue(makeRule({ interval: 3, duration: 45 }))
    const onRuleUpdated = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ScheduleMeetingForm chapterId="c1" editRuleId="rule-1" onRuleUpdated={onRuleUpdated} onCancel={onCancel} />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('3')).toBeInTheDocument()
    expect(screen.queryByText('Date & Time')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateRecurringRule).toHaveBeenCalledWith('rule-1', {
        frequency: MeetingFrequency.WEEKLY,
        interval: 3,
        duration: 45,
        endDate: null,
      })
    )
    expect(onRuleUpdated).toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ScheduleMeetingForm chapterId="c1" onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
