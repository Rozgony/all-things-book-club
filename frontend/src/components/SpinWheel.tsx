import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { MeetingStatus, type Meeting, type Topic } from '../api/types'
import { ConfirmModal } from './ConfirmModal'

interface SpinWheelProps {
	topics: Topic[]
	onSpinEnd: (topic: Topic) => void
	spinning: boolean
	updateMeetingStatus: (status: MeetingStatus) => void
	meeting: Meeting
	onSpinStart: () => void
}

const COLORS = [
	'#C0876F', '#7D9E7A', '#D4A96A', '#8B7355', '#A67C6D',
	'#6B8E7A', '#C4956A', '#7A8E6B', '#B07850', '#8E7A6B',
]

export function SpinWheel({ topics, onSpinEnd, spinning, onSpinStart, updateMeetingStatus, meeting }: SpinWheelProps) {
	const svgRef = useRef<SVGSVGElement>(null)
	const rotationRef = useRef(0)

	const getWheelSize = () =>
		window.innerWidth > 900 ? window.innerWidth / 2 - 72 : window.innerWidth - 72

	const [wheelSize, setWheelSize] = useState(getWheelSize)
	const [showStartMeeting, setShowStartMeeting] = useState(false)

	useEffect(() => {
		const handleResize = () => setWheelSize(getWheelSize())
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	const pendingTopics = topics.filter(t => t.status === 'PENDING')
	const size = 600
	const radius = size / 2 - 10
	const cx = size / 2
	const cy = size / 2

	useEffect(() => {
		if (!svgRef.current || pendingTopics.length === 0) return

		const svg = d3.select(svgRef.current)
		svg.selectAll('*').remove()

		const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)
		const pie = d3.pie<Topic>().value(() => 1).sort(null)
		const arc = d3.arc<d3.PieArcDatum<Topic>>().innerRadius(0).outerRadius(radius)

		const arcs = g.selectAll('g.arc')
			.data(pie(pendingTopics))
			.enter().append('g')
			.attr('class', 'arc')

		arcs.append('path')
			.attr('d', arc)
			.attr('fill', (_, i) => COLORS[i % COLORS.length])
			.attr('stroke', 'white')
			.attr('stroke-width', 2)

		arcs.append('text')
			.attr('transform', d => {
				const [x, y] = arc.centroid(d)
				const midAngle = (d.startAngle + d.endAngle) / 2
				const rotateDeg = midAngle * 180 / Math.PI + 90
				return `translate(${x * 1.2},${y * 1.2}) rotate(${rotateDeg})`
			})
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'white')
			.attr('font-size', pendingTopics.length > 6 ? '18' : '20')
			.attr('font-weight', '600')
			.each(function(d) {
				const words = d.data.title.split(' ')
				const text = d3.select(this)
				if (words.length <= 2) {
					text.text(d.data.title)
				} else {
					let dyArray = []
					if (words.length <= 4) {
						dyArray = [`-0.6em`,'',`1.2em`,'']
					} else if (words.length <= 6) {
						dyArray = [`-1em`,'',`1.2em`,'',`1.2em`,'']
					} else if (words.length <= 8) {
						dyArray = [`-1.6em`,'',`1.2em`,'',`1.2em`,'',`1.2em`,'']
					} else {
						dyArray = [`-2.8em`,'',`1.2em`,'',`1.2em`,'',`1.2em`,'',`1.2em`,'',`1.2em`,'']
					}
					const wordsLength = words.length < 12 ? words.length : 12
					for (let index = 0; index < wordsLength; index += 2) {
						const wordOne = words[index];
						const wordTwo = words[index+1] ? ` ${words[index+1]}` : ''
						text.append('tspan').attr('x', 0).attr('dy', dyArray[index]).text(`${wordOne}${wordTwo}`)
					}
				}
			})

	}, [pendingTopics.map(t => t.id).join(',')])

	const handleSpin = () => {
		if (meeting.status !== 'ACTIVE') {
			setShowStartMeeting(true);
			return;
		}
		if (spinning || pendingTopics.length === 0) return
		onSpinStart()

		const spins = 5 + Math.random() * 5
		const extraDeg = Math.random() * 360
		const totalDeg = spins * 360 + extraDeg
		const finalRotation = rotationRef.current + totalDeg
		rotationRef.current = finalRotation % 360

		const wheel = svgRef.current?.querySelector('g')
		if (!wheel) return

		const duration = 4000
		const start = performance.now()
		const startRot = finalRotation - totalDeg

		const animate = (now: number) => {
			const elapsed = now - start
			const progress = Math.min(elapsed / duration, 1)
			// Ease out cubic
			const eased = 1 - Math.pow(1 - progress, 3)
			const current = startRot + totalDeg * eased
			wheel.setAttribute('transform', `translate(${cx},${cy}) rotate(${current})`)

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				// Determine which topic landed at the right (90 degrees = 3 o'clock)
				const normalized = ((rotationRef.current % 360) + 360) % 360
				const anglePerSlice = 360 / pendingTopics.length
				// D3 pie: angle 0 = 12 o'clock, clockwise. Pointer at 270° (9 o'clock).
				const pointerAngle = (270 - normalized + 360) % 360
				const index = Math.floor(pointerAngle / anglePerSlice) % pendingTopics.length
				onSpinEnd(pendingTopics[index])
			}
		}
		requestAnimationFrame(animate)
	}

	if (pendingTopics.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center w-full h-64 text-stone-muted">
				{ topics.length !== 0 ? <p className="text-lg font-heading">No topics left to spin!</p> : null }
				<p className="text-sm mt-1">Add topics below to get started.</p>
			</div>
		)
	}

	return (
		<div className="gap-4">
			<button
				onClick={handleSpin}
				disabled={spinning}
				className="px-4 py-2 bg-forest text-white font-heading tracking-wide rounded hover:bg-forest-dark transition-colors disabled:opacity-50 text-lg absolute z-50"
			>
				{spinning ? 'Spinning…' : 'Spin!'}
			</button>
			<div className="relative flex flex-col items-center">
				{/* Pointer triangle at right */}
				<div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-10">
					<div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '20px solid #C0876F' }} />
				</div>
				<svg ref={svgRef} viewBox={`0 0 ${size} ${size}`} width={wheelSize} height={wheelSize} style={{ display: 'block' }} />
			</div>
			{ showStartMeeting ? <ConfirmModal
				header="Start Meeting?"
				bodyText=""
				confirmText="Yes"
				cancelText="No"
				confirmColor="bg-forest"
				onConfirm={() => {
					updateMeetingStatus(MeetingStatus.ACTIVE)
					setShowStartMeeting(false)
				}}
				onCancel={() => setShowStartMeeting(false)}
				confirming={false}
			/> : null }
		</div>
	)
}
