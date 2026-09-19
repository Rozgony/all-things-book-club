import { Nav } from '../../components/Nav'

const cardClass = 'bg-white rounded border border-warm-border text-forest-deep p-6 my-8 text-left'

export function PrivacyPage() {
	return (
		<>
			<Nav showLogin={true} showLogout={true} showProfile={true} />
			<div className="max-w-2xl mx-auto px-4 py-10">
				<h1>Privacy & Encryption</h1>
				<h4>What we can see, what we can't, and why.</h4>

				<div className={cardClass}>
					<h3>Our Commitment</h3>
					<p className="py-2">
						Every chapter name, meeting note, and discussion topic is encrypted on your device before it's ever sent to
						us with AES-256-GCM, using keys derived from your password via Argon2id. Even if our database were breached
						or subpoenaed, all anyone would get is unreadable ciphertext — we can't read your data.
					</p>
				</div>

				<div className={cardClass}>
					<h3>What the Server Can and Can't See</h3>
					<p className="py-2">
						Content — profiles, chapter names, meeting notes, topics, themes — is always encrypted, decryptable only by
						members via keys they hold. Metadata needed to run the app stays in plaintext: chapter visibility, your role,
						and meeting time/status. Invite secrets are never stored server-side at all — they live only in the invite URL.
					</p>
				</div>

				<div className={cardClass}>
					<h3>Key Hierarchy</h3>
					<p className="py-2">
						Your password derives a <code>userKey</code> (via Argon2id), which wraps your personal copy of each chapter's{' '}
						<code>chapterKey</code>. The <code>chapterKey</code> encrypts everything inside that chapter.
					</p>
				</div>

				<div className={cardClass}>
					<h3>Invitations</h3>
					<p className="py-2">
						Inviting someone hands them the <code>chapterKey</code> via a one-time secret placed in the URL's hash
						fragment, which is never sent to our server. Their browser unwraps it and re-wraps it with their own{' '}
						<code>userKey</code> once they accept. Invites expire after 7 days, and accepted or not, the record is deleted
						once used. 
					</p>
					<p className="py-2">It is important to note the invite emails themselves are not encrypted because most emails are not encrypted. 
						While we will not read the invite emails, if you want a fully encrypted experience, copy the invite link and sent it via 
						a more secure method such as an encrypted chat app like Signal.</p>
				</div>

				<div className={cardClass}>
					<h3>What This Can't Protect Against</h3>
					<p className="py-2">
						A compromised device, a forgotten password, or a chapter member screenshotting decrypted
						content on their own screen is not something we can protect against. Encryption protects data in transit and at rest — it can't protect against people.
					</p>
				</div>

				<div className={cardClass}>
					<h3>Open Source</h3>
					<p className="py-2">
						The full source, including every crypto function described above, is public:{' '}
						<a
							className="text-terracotta hover:text-terracotta-dark underline break-all"
							href="https://github.com/Rozgony/all-things-book-club"
							target="_blank"
							rel="noreferrer"
						>
							github.com/Rozgony/all-things-book-club
						</a>
						. Start with <code>frontend/src/lib/crypto.ts</code>.
					</p>
				</div>
			</div>
		</>
	)
}
