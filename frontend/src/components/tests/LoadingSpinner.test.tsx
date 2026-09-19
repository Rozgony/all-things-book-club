import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'
import { SpinnerSize } from '../../api/types'

describe('LoadingSpinner', () => {
  it('renders at the large size by default', () => {
    const { container } = render(<LoadingSpinner />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '80')
    expect(svg).toHaveAttribute('height', '80')
  })

  it('renders at the small size when requested', () => {
    const { container } = render(<LoadingSpinner size={SpinnerSize.SM} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '30')
    expect(svg).toHaveAttribute('height', '30')
  })

  it('renders five pie slices', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.querySelectorAll('path')).toHaveLength(5)
  })
})
