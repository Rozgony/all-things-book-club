import { useEffect, useRef, useState } from 'react'
import { SpinWheel } from '../Meetings/SpinWheel'
import { type Topic } from '../../api/types'
import {
	DEMO_MEETING,
	DEMO_TOPIC_DURATION_MS,
	DEMO_SPIN_DURATION_MS,
	DEMO_BUBBLE_MAX_CHARS,
	MODAL_DELAY_MS,
	demoTopics,
	demoConversations,
} from './DemoData'

const truncate = (text: string) =>
	text.length > DEMO_BUBBLE_MAX_CHARS ? `${text.slice(0, DEMO_BUBBLE_MAX_CHARS)}\u2026` : text

export function LoginSpinDemo() {
	const [spinning, setSpinning] = useState(false)
	const [autoSpinSignal, setAutoSpinSignal] = useState(0)
	const [activeTopic, setActiveTopic] = useState<Topic | null>(null)
	const [visibleCount, setVisibleCount] = useState(0)
	const timeoutIdsRef = useRef<number[]>([])

	const clearTimers = () => {
		timeoutIdsRef.current.forEach(id => window.clearTimeout(id))
		timeoutIdsRef.current = []
	}

	const startCycle = () => {
		clearTimers()
		setActiveTopic(null)
		setVisibleCount(0)
		setAutoSpinSignal(s => s + 1)
		timeoutIdsRef.current.push(window.setTimeout(startCycle, DEMO_TOPIC_DURATION_MS))
	}

	useEffect(() => {
		startCycle()
		return clearTimers
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleSpinEnd = (topic: Topic) => {
		setSpinning(false)
		setActiveTopic(topic)

		const messages = demoConversations[topic.id] ?? []
		const talkWindow = DEMO_TOPIC_DURATION_MS - DEMO_SPIN_DURATION_MS
		const interval = messages.length > 0 ? talkWindow / (messages.length + 1) : talkWindow
		messages.forEach((_, i) => {
			timeoutIdsRef.current.push(
				window.setTimeout(() => setVisibleCount(c => Math.max(c, i + 1)), MODAL_DELAY_MS + interval * i)
			)
		})
	}

	const messages = activeTopic ? demoConversations[activeTopic.id] ?? [] : []
	const conversationActive = visibleCount > 0

	return (
		<div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
			<div className={`transition-opacity ${conversationActive ? 'opacity-40' : 'opacity-100'}`}>
				<SpinWheel
					
					topics={demoTopics}
					meeting={DEMO_MEETING}
					spinning={spinning}
					onSpinStart={() => setSpinning(true)}
					onSpinEnd={handleSpinEnd}
					updateMeetingStatus={() => {}}
					autoSpinSignal={autoSpinSignal}
				/>
			</div>

			{activeTopic && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
					<div
						className={`absolute bg-white rounded border border-warm-border p-6 text-center transition-opacity ${conversationActive ? 'opacity-40' : 'opacity-100'}`}
						style={{ boxShadow: 'var(--shadow)', width: '375px', maxWidth: '100%' }}
					>
						<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-2">Selected Topic</p>
						<h2 className="font-heading text-forest-deep text-2xl mb-3">{activeTopic.title}</h2>
						{activeTopic.description && (
							<div className="text-sm text-stone-muted whitespace-pre-wrap">{activeTopic.description}</div>
						)}
					</div>

					{conversationActive && (
						<div className="absolute top-0 z-20 w-full flex flex-col gap-1 md:gap-3">
							{messages.slice(0, visibleCount).map((m, i) => {
								// stable pseudo-random indent (0–18%) — desktop only
								const indent = `${(i * 41 + 7) % 19}%`
								return (
								<div
									key={i}
									className={`flex items-start gap-2 ${m.side === 'right' ? 'flex-row-reverse' : ''}`}
									style={window.innerWidth >= 768 ? (m.side === 'left' ? { marginLeft: indent } : { marginRight: indent }) : undefined}
								>
									<div
										className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
											m.side === 'left' ? 'bg-forest' : 'bg-terracotta'
										}`}
									>
										{m.name[0]}
									</div>
									<div
										className={`py-2 px-3 rounded-lg text-sm text-stone max-w-[80%] md:max-w-[60%] ${
											m.side === 'left'
												? 'bg-forest-light'
												: 'bg-terracotta-light'
										}`}
									>
										<div className="text-xs font-semibold text-stone-muted mb-0.5">{m.name}</div>
										{truncate(m.text)}
									</div>
								</div>
								)
							})}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
