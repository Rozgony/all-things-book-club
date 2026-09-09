import { type Topic, type Theme } from '../../api/types'

interface TopicModalProps {
	topic: Topic | null
	chapterThemes?: Theme[]
	onMarkDiscussed: () => void
	onSkip: () => void
	onClose?: () => void
	readOnly?: boolean
}

export function TopicModal({ topic, chapterThemes = [], onMarkDiscussed, onSkip, onClose, readOnly }: TopicModalProps) {
	if (!topic) return null

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded border border-warm-border p-6 w-full text-center" style={{ boxShadow: 'var(--shadow)', width: '375px', maxWidth: '100%' }}>
				<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-2">Selected Topic</p>
				<h2 className="font-heading text-forest-deep text-2xl mb-3">{
						topic.url ? (<a className="text-terracotta hover:text-terracotta-dark underline text-sm break-all" href={topic.url}>{topic.title}</a>) : (topic.title)
				}</h2>
				{topic.themeIds && topic.themeIds.length > 0 && (
					<div className="flex flex-wrap gap-1 justify-center mb-4">
						{topic.themeIds.map(themeId => {
							const theme = chapterThemes.find(t => t.id === themeId)
							if (!theme) return null
							return (
								<span key={themeId} className="text-sm text-terracotta">
									#{theme.name}
								</span>
							)
						})}
					</div>
				)}
				{topic.description && (
					<div className="text-sm text-stone-muted mb-4 whitespace-pre-wrap">{topic.description}</div>
				)}
				{readOnly ? (
					<button
						onClick={onClose}
						className="w-full px-4 py-2.5 border border-warm-border text-stone-muted rounded hover:bg-cream transition-colors"
					>
						Close
					</button>
				) : (
					<div className="flex gap-3 justify-center">
						<button
							onClick={onMarkDiscussed}
							className="flex-1 px-4 py-2.5 bg-terracotta text-white rounded hover:bg-terracotta-dark transition-colors"
						>
							Mark Discussed
						</button>
						<button
							onClick={onSkip}
							className="flex-1 px-4 py-2.5 border border-warm-border text-stone-muted rounded hover:bg-cream transition-colors"
						>
							Skip
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
