import { Nav } from '../../components/Nav'

// Placeholder — full privacy & encryption writeup pending (see documentation/privacy-and-encryption.md).
export function PrivacyPage() {
	return (
		<>
			<Nav />
			<div className="flex items-center justify-center min-h-screen bg-cream">
				<div className="w-full max-w-lg px-8 py-10 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
					<h2 className="font-heading text-forest-deep mb-3">Privacy & Encryption</h2>
					<p className="text-sm text-stone-muted">
						This page is coming soon. It will explain what All Things Book Club can and cannot see about your data, and how end-to-end encryption protects it.
					</p>
				</div>
			</div>
		</>
	)
}
