import { useNavigate } from 'react-router-dom'
import { type Chapter } from '../api/types'

interface ChapterCardProps {
	chapter: Chapter,
	bgColor: string
}

export function ChapterCard({ chapter, bgColor }: ChapterCardProps) {
	const navigate = useNavigate()
	const classes = bgColor === 'white' ? 'bg-white hover:shadow-md' : 'bg-cream/30 hover:bg-cream/50';
	return (
		<button
			onClick={() => navigate(`/chapters/${chapter.id}`)}
			className={`${classes} w-full text-left p-4 bg-cream/30 rounded border border-warm-border hover:border-terracotta/50 hover:bg-cream/50 transition-all`}
		>
			<h3 className="font-heading text-forest-deep">{chapter.name}</h3>
			{chapter.description && (
				<p className="text-sm text-stone-muted mt-1">{chapter.description}</p>
			)}
		</button>
	)
}
