// Package mailer sends transactional emails via SMTP (Resend in prod/dev).
package mailer

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"net/smtp"
	"strings"
	texttemplate "text/template"

	"github.com/all-things-book-club/internal/config"
)

//go:embed templates/*.tmpl
var templateFS embed.FS

// html/template auto-escapes values in HTML context; text/template does not
// (and shouldn't, for the plain-text fallback).
var inviteHTMLTmpl = template.Must(template.ParseFS(templateFS, "templates/invite.html.tmpl"))
var inviteTextTmpl = texttemplate.Must(texttemplate.ParseFS(templateFS, "templates/invite.txt.tmpl"))

type Mailer struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

type inviteEmailData struct {
	InviterEmail string
	InviteURL    string
}

// SendInviteEmail sends the invite link to a prospective member. The link
// itself carries the invite secret in the URL fragment, which this function
// never inspects — it just forwards the fully-built link.
func (m *Mailer) SendInviteEmail(toEmail, inviterEmail, inviteURL string) error {
	subject := fmt.Sprintf("%s invited you to a book club chapter", inviterEmail)
	data := inviteEmailData{InviterEmail: inviterEmail, InviteURL: inviteURL}

	var textBuf, htmlBuf bytes.Buffer
	if err := inviteTextTmpl.Execute(&textBuf, data); err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: render text template: %w", err)
	}
	if err := inviteHTMLTmpl.Execute(&htmlBuf, data); err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: render html template: %w", err)
	}

	boundary := "atbc-invite-boundary"
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\n", m.cfg.SMTPFrom, toEmail, subject)
	fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=\"%s\"\r\n\r\n", boundary)
	fmt.Fprintf(&b, "--%s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s\r\n\r\n", boundary, textBuf.String())
	fmt.Fprintf(&b, "--%s\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s\r\n\r\n", boundary, htmlBuf.String())
	fmt.Fprintf(&b, "--%s--\r\n", boundary)
	msg := b.String()

	addr := fmt.Sprintf("%s:%s", m.cfg.SMTPHost, m.cfg.SMTPPort)
	auth := smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPass, m.cfg.SMTPHost)

	if err := smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: %w", err)
	}
	return nil
}
