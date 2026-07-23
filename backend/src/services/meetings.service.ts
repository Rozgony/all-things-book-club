import { prisma } from '../lib/prisma'

/**
 * Create a new meeting
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
export async function createMeeting(
	data: { scheduledAt: Date; duration?: number, chapterId: string }
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
 * Caller is responsible for validating that the creator exists and has proper permissions
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
 * Caller is responsible for validating that the creator exists and has proper permissions
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
	duration?: number
	status?: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
	discussionNotes: any
	topics: any
}

/**
 * Update the name or description of a Chapter
 * Caller is responsible for validating that the user is an admin of the chapter
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
 * Caller is responsible for validating that the user is the creator
 */
export async function deleteMeeting(
	id: string,
) {
	return prisma.meeting.delete({
	  where: { id },
	})
}

/** TODO v2
 * Add a DiscussionNote to a Meeting (creates a DiscussionNote Junction Object)
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function addChapterMember(
//   chapterId: string,
//   userId: string, 
//   role: ChapterMemberRole
// ) {
//     return prisma.chapterMember.create({
//     data: { chapterId, userId, role }
//     })
// }

/** TODO v2
 * Remove a DiscussionNote from a Meeting
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function removeChapterMember(
//   chapterId: string,
//   userId: string, 
// ) {
//   return prisma.chapter.update({
//     where: { id: chapterId },
//     data: {
//         members: {
//             deleteMany: { 
//                 chapterId, 
//                 userId 
//             }
//         }
//     }
//   })
// }

/** TODO v2
 * Add a Topic to a Meeting (creates a Topic Junction Object)
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function addChapterMember(
//   chapterId: string,
//   userId: string, 
//   role: ChapterMemberRole
// ) {
//     return prisma.chapterMember.create({
//     data: { chapterId, userId, role }
//     })
// }

/** TODO v2
 * Remove a Topic from a Meeting
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function removeChapterMember(
//   chapterId: string,
//   userId: string, 
// ) {
//   return prisma.chapter.update({
//     where: { id: chapterId },
//     data: {
//         members: {
//             deleteMany: { 
//                 chapterId, 
//                 userId 
//             }
//         }
//     }
//   })
// }

