import { type Topic } from '../../api/types'

interface TopicModalProps {
	topic: Topic | null
	onMarkDiscussed: () => void
	onSkip: () => void
}

export function TopicModal({ topic, onMarkDiscussed, onSkip }: TopicModalProps) {
	if (!topic) return null

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded border border-warm-border p-8 max-w-md w-full text-center" style={{ boxShadow: 'var(--shadow)' }}>
				<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-2">Selected Topic</p>
				<h2 className="font-heading text-forest-deep text-2xl mb-6">{topic.title}</h2>
				<div className="flex gap-3 justify-center">
					<button
						onClick={onMarkDiscussed}
						className="px-6 py-2.5 bg-terracotta text-white rounded hover:bg-terracotta-dark transition-colors"
					>
						Mark Discussed
					</button>
					<button
						onClick={onSkip}
						className="px-6 py-2.5 border border-warm-border text-stone-muted rounded hover:bg-cream transition-colors"
					>
						Skip
					</button>
				</div>
			</div>
		</div>
	)
}
