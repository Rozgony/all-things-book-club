import { type Topic, type Theme } from '../../api/types'

interface TopicCardProps {
	topic: Topic
	chapterThemes: Theme[]
	onEdit: (topic: Topic) => void
	onDelete: (topicId: string) => void
}

export function TopicCard({ topic, chapterThemes, onEdit, onDelete }: TopicCardProps) {
	return (
		<div className="flex justify-between items-start gap-2">
			<div className="flex-1 min-w-0">
				<span className="text-sm text-stone">{topic.title}</span>
				{topic.description && (
					<p className="text-xs text-stone-muted mt-0.5">
						{topic.description.length > 120 ? topic.description.substring(0, 120) + '…' : topic.description}
					</p>
				)}
				{topic.themeIds && topic.themeIds.length > 0 && (
					<div className="flex flex-wrap gap-1 mt-1">
						{topic.themeIds.map(themeId => {
							const theme = chapterThemes.find(t => t.id === themeId)
							if (!theme) return null
							return (
								<span key={themeId} className="px-1.5 py-0.5 bg-forest/10 text-forest-deep text-xs rounded-full">
									#{theme.name}
								</span>
							)
						})}
					</div>
				)}
			</div>
			<div className="flex items-center gap-1 shrink-0">
				<button
					onClick={() => onEdit(topic)}
					className="text-xs text-stone-muted hover:text-stone transition-colors px-1"
					title="Edit topic"
				>
					✏️
				</button>
				<button
					onClick={() => onDelete(topic.id)}
					className="text-xs text-stone-muted hover:text-red-500 transition-colors"
				>
					remove
				</button>
			</div>
		</div>
	)
}
