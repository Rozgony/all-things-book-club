import { MeetingStatus, type Meeting, type Topic } from '../../api/types'

export const DEMO_TOPIC_DURATION_MS = 15000
export const DEMO_SPIN_DURATION_MS = 4000
export const DEMO_BUBBLE_MAX_CHARS = 300

export interface DemoMessage {
	side: 'left' | 'right'
	name: string
	text: string
}

// Fake ACTIVE meeting so the real SpinWheel component can be reused as-is
export const DEMO_MEETING: Meeting = {
	id: 'demo-meeting',
	chapterId: 'demo-chapter',
	scheduledAt: new Date().toISOString(),
	duration: 60,
	status: MeetingStatus.ACTIVE,
	recurringGroupId: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
}

export const demoTopics: Topic[] = [
	{
		id: 'demo-1',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: DEMO_MEETING.createdAt,
		updatedAt: DEMO_MEETING.updatedAt,
		title: 'Barbenheimer Summer',
		description: 'Barbie and Oppenheimer, released the same weekend.',
	},
	{
		id: 'demo-2',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: DEMO_MEETING.createdAt,
		updatedAt: DEMO_MEETING.updatedAt,
		title: "Taylor Swift's Eras Tour",
		description: 'The concert film that broke box office records.',
	},
	{
		id: 'demo-3',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: DEMO_MEETING.createdAt,
		updatedAt: DEMO_MEETING.updatedAt,
		title: 'The Bear Season 3',
		description: 'Why the new season split fans down the middle.',
	},
	{
		id: 'demo-4',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: DEMO_MEETING.createdAt,
		updatedAt: DEMO_MEETING.updatedAt,
		title: 'Dune: Part Two',
		description: 'Prophecy, power, and Chani\u2019s arc.',
	},
	{
		id: 'demo-5',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: DEMO_MEETING.createdAt,
		updatedAt: DEMO_MEETING.updatedAt,
		title: 'Wednesday: Season 3?',
		description: 'Should Nevermore Academy get another season.',
	},
	{
		id: 'demo-6',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: DEMO_MEETING.createdAt,
		updatedAt: DEMO_MEETING.updatedAt,
		title: 'Spotify Wrapped Confessions',
		description: 'Our most embarrassing top songs of the year.',
	},
]

// Two recurring "members" carry every demo conversation, alternating left/right
export const demoConversations: Record<string, DemoMessage[]> = {
	'demo-1': [
		{ side: 'left', name: 'Maya', text: "Okay, I have to talk about Barbenheimer. Watching both in one day was the biggest tonal whiplash of my life \u2014 pink dream house one minute, nuclear dread the next \u2014 and somehow the unhinged double feature just worked." },
		{ side: 'right', name: 'Devon', text: 'I went Oppenheimer first, so Barbie hit like comic relief therapy afterward. Genuinely needed it.' },
		{ side: 'left', name: 'Maya', text: 'The meme was more fun than either studio could\u2019ve planned, honestly. Free marketing gold.' },
		{ side: 'right', name: 'Devon', text: 'It saved movie theaters that whole summer. I will absolutely take the whiplash for that.' },
	],
	'demo-2': [
		{ side: 'left', name: 'Maya', text: "The Eras Tour movie made me cry in a theater full of strangers in friendship bracelets, and I regret nothing. Three and a half hours flew by, which should not be physically possible for a concert film." },
		{ side: 'right', name: 'Devon', text: 'The surprise songs section alone is worth the ticket. I went in skeptical and left planning a re-watch.' },
		{ side: 'left', name: 'Maya', text: 'Same. My knees still hurt from standing the whole time, no regrets though.' },
		{ side: 'right', name: 'Devon', text: 'It broke box office records for a reason \u2014 that show is a genuine phenomenon.' },
	],
	'demo-3': [
		{ side: 'left', name: 'Maya', text: "The Bear season three split everyone I know right down the middle. Some people loved the slower, quieter episodes and others just wanted more kitchen chaos and yelling like the first two seasons." },
		{ side: 'right', name: 'Devon', text: 'I was fully on team "give me the chaos." The fine-dining fantasy episodes lost me a little.' },
		{ side: 'left', name: 'Maya', text: 'Fair, but that flashback episode wrecked me emotionally in the best way.' },
		{ side: 'right', name: 'Devon', text: 'Okay yes, that one episode alone almost redeems the slower pacing for me.' },
	],
	'demo-4': [
		{ side: 'left', name: 'Maya', text: "Dune Part Two took the prophecy stuff so much more seriously than I expected, and Chani basically became the moral center of the whole story fighting against being turned into a legend instead of a person." },
		{ side: 'right', name: 'Devon', text: 'That ending genuinely surprised me \u2014 it did not feel like a typical chosen-one victory lap at all.' },
		{ side: 'left', name: 'Maya', text: 'Right, it felt more like a warning than a triumph, which I really respected.' },
		{ side: 'right', name: 'Devon', text: 'Now I just need Part Three immediately, that cliffhanger was brutal.' },
	],
	'demo-5': [
		{ side: 'left', name: 'Maya', text: "I need a Wednesday season three announcement yesterday. That cliffhanger left way too many threads dangling, and Nevermore Academy has way more mysteries left to explore before this story can wrap up." },
		{ side: 'right', name: 'Devon', text: 'The side characters deserve more screen time too, not just Wednesday carrying every single scene.' },
		{ side: 'left', name: 'Maya', text: 'Agreed, Enid especially. Give her a real arc beyond being the supportive roommate.' },
		{ side: 'right', name: 'Devon', text: 'Honestly the whole cast is strong enough to support a bigger ensemble season.' },
	],
	'demo-6': [
		{ side: 'left', name: 'Maya', text: "Spotify Wrapped exposed me this year. My top song was on repeat so many times I am genuinely embarrassed, and now all my friends know exactly how much I relapsed into my middle school music phase." },
		{ side: 'right', name: 'Devon', text: 'Mine was worse \u2014 apparently I am in the top 0.1% of listeners for a song I forgot existed.' },
		{ side: 'left', name: 'Maya', text: 'The algorithm truly has no mercy and no sense of privacy whatsoever.' },
		{ side: 'right', name: 'Devon', text: 'At least we can suffer through Wrapped season together every year.' },
	],
}
