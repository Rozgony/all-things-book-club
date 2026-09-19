import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeetingStatusBadge } from '../MeetingStatusBadge'
import { MeetingStatus } from '../../api/types'

describe('MeetingStatusBadge', () => {
  it.each([
    [MeetingStatus.SCHEDULED, 'Scheduled'],
    [MeetingStatus.ACTIVE, 'Active Now'],
    [MeetingStatus.COMPLETED, 'Completed'],
    [MeetingStatus.CANCELLED, 'Cancelled'],
  ])('renders the readable label for %s', (status, label) => {
    render(<MeetingStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('applies the active styling only for ACTIVE meetings', () => {
    const { rerender } = render(<MeetingStatusBadge status={MeetingStatus.ACTIVE} />)
    expect(screen.getByText('Active Now')).toHaveClass('bg-forest-light')

    rerender(<MeetingStatusBadge status={MeetingStatus.COMPLETED} />)
    expect(screen.getByText('Completed')).toHaveClass('bg-cream')
  })
})
