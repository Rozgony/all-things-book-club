// Package mailer sends transactional emails via the Resend HTTPS API.
package mailer

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	texttemplate "text/template"

	"github.com/all-things-book-club/internal/config"
)

//go:embed templates/*.tmpl
var templateFS embed.FS

// html/template auto-escapes values in HTML context; text/template does not
// (and shouldn't, for the plain-text fallback).
var inviteHTMLTmpl = template.Must(template.ParseFS(templateFS, "templates/invite.html.tmpl"))
var inviteTextTmpl = texttemplate.Must(texttemplate.ParseFS(templateFS, "templates/invite.txt.tmpl"))

const resendAPIURL = "https://api.resend.com/emails"

type Mailer struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

type inviteEmailData struct {
	InviterName string
	InviteURL   string
}

type resendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
	Text    string   `json:"text"`
}

// SendInviteEmail sends the invite link to a prospective member. The link
// itself carries the invite secret in the URL fragment, which this function
// never inspects — it just forwards the fully-built link.
//
// This goes over Resend's HTTPS API rather than SMTP because Railway blocks
// outbound SMTP ports by default, which causes SMTP sends to time out.
func (m *Mailer) SendInviteEmail(toEmail, inviterName, inviteURL string) error {
	subject := fmt.Sprintf("%s invited you to a book club chapter", inviterName)
	data := inviteEmailData{InviterName: inviterName, InviteURL: inviteURL}

	var textBuf, htmlBuf bytes.Buffer
	if err := inviteTextTmpl.Execute(&textBuf, data); err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: render text template: %w", err)
	}
	if err := inviteHTMLTmpl.Execute(&htmlBuf, data); err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: render html template: %w", err)
	}

	body, err := json.Marshal(resendEmailRequest{
		From:    m.cfg.EmailFrom,
		To:      []string{toEmail},
		Subject: subject,
		Html:    htmlBuf.String(),
		Text:    textBuf.String(),
	})
	if err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: marshal request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+m.cfg.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("mailer.SendInviteEmail: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("mailer.SendInviteEmail: resend API returned status %d", resp.StatusCode)
	}
	return nil
}
