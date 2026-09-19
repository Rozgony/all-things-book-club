import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailPasswordForm } from '../EmailPasswordForm'

describe('EmailPasswordForm', () => {
  it('renders email and password fields by default', () => {
    const { container } = render(
      <EmailPasswordForm onSubmit={vi.fn()} email="a@b.com" password="secret" onPasswordChange={vi.fn()} submitLabel="Log in" />
    )
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument()
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('hides the email field when showEmail is false', () => {
    const { container } = render(
      <EmailPasswordForm onSubmit={vi.fn()} showEmail={false} password="secret" onPasswordChange={vi.fn()} submitLabel="Log in" />
    )
    expect(container.querySelector('input[type="email"]')).not.toBeInTheDocument()
  })

  it('calls onEmailChange and onPasswordChange as the user types', async () => {
    const onEmailChange = vi.fn()
    const onPasswordChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <EmailPasswordForm onSubmit={vi.fn()} email="" onEmailChange={onEmailChange} password="" onPasswordChange={onPasswordChange} submitLabel="Log in" />
    )

    await user.type(container.querySelector('input[type="email"]')!, 'a')
    await user.type(container.querySelector('input[type="password"]')!, 'b')

    expect(onEmailChange).toHaveBeenCalledWith('a')
    expect(onPasswordChange).toHaveBeenCalledWith('b')
  })

  it('calls onSubmit when the form is submitted', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    const user = userEvent.setup()
    render(<EmailPasswordForm onSubmit={onSubmit} email="a@b.com" password="secret" onPasswordChange={vi.fn()} submitLabel="Log in" />)

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('shows the error message when provided', () => {
    render(<EmailPasswordForm onSubmit={vi.fn()} password="b" onPasswordChange={vi.fn()} submitLabel="Log in" error="Invalid credentials" />)
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })

  it('disables the submit button and shows the submitting label while submitting', () => {
    render(
      <EmailPasswordForm
        onSubmit={vi.fn()}
        password="b"
        onPasswordChange={vi.fn()}
        submitLabel="Log in"
        submittingLabel="Logging in…"
        submitting
      />
    )
    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled()
  })

  it('renders the footer node when provided', () => {
    render(
      <EmailPasswordForm onSubmit={vi.fn()} password="b" onPasswordChange={vi.fn()} submitLabel="Log in" footer={<p>Forgot password?</p>} />
    )
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
  })
})
