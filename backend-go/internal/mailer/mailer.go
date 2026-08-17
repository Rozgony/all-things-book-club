// Package mailer sends transactional emails via SMTP (Resend in prod/dev).
package mailer

import (
	"fmt"
	"net/smtp"

	"github.com/all-things-book-club/internal/config"
)

type Mailer struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

// SendInviteEmail sends the invite link to a prospective member. The link
// itself carries the invite secret in the URL fragment, which this function
// never inspects — it just forwards the fully-built link.
func (m *Mailer) SendInviteEmail(toEmail, inviterEmail, inviteURL string) error {
	subject := fmt.Sprintf("%s invited you to a book club chapter", inviterEmail)
	body := fmt.Sprintf(
		"%s has invited you to join a chapter on All Things Book Club.\r\n\r\nAccept your invite: %s\r\n\r\nThis link expires in 7 days.",
		inviterEmail, inviteURL,
	)
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		m.cfg.SMTPFrom, toEmail, subject, body)

	addr := fmt.Sprintf("%s:%s", m.cfg.SMTPHost, m.cfg.SMTPPort)
	auth := smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPass, m.cfg.SMTPHost)

	if err := smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: %w", err)
	}
	return nil
}
