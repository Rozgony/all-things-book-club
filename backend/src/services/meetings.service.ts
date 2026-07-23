import { prisma } from '../lib/prisma'

/**
 * Create a new meeting
 */
export async function createMeeting(
	data: { scheduledAt: Date; duration?: Number, chapterId?: string }
) {
	console.log({data});
	return prisma.meeting.create({
	  	data: {
			scheduledAt: data.scheduledAt,
			duration: data.duration,
			chapterId: data.chapterId
	    },
	})
}

/**
 * Get a meeting by Id
 */
export async function getMeetingById(
	id: string,
	includeNotes?: boolean,
	includeTopics?: boolean,
	includeChapter?: boolean
) {
		console.log('getMeetingById id: '+id)

	return prisma.meeting.findUnique({
	  	where: { id },
	  	include: {
	    	discussionNotes: !!includeNotes,
			topics: !!includeTopics,
			chapter: !!includeChapter
	  	}
	})
}

/**
 * Get all of the Chapters that a User belongs to
 */
export async function getMeetingsByChapterId(
	chapterId: string,
	includeNotes?: boolean,
	includeTopics?: boolean
) {
		console.log('getMeetingsByChapterId chapterId: '+chapterId)
	return prisma.meeting.findMany({
	  	where: { 
			chapterId 
	  	},
	  	include: {
	    	discussionNotes: !!includeNotes,
			topics: !!includeTopics
	  	}
	})
}

export type UpdateMeetingData = {
	scheduledAt?: Date
	duration?: Number
	status?: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
	discussionNotes: any
	topics: any
}

/**
 * Update the name or description of a Chapter
 */
export async function updateMeeting(
	id: string,
	meetingData: UpdateMeetingData
) {
	return prisma.meeting.update({
	  	where: { id },
	  	data: {
	    	...meetingData
	  	},
	  	include: { 
			topics: true,
			discussionNotes: true
	 	},
	})
}

/**
 * Delete a Chapter
 */
export async function deleteMeeting(
	id: string,
) {
	return prisma.meeting.delete({
	  where: { id },
	})
}
