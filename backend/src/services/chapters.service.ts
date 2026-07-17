import { ChapterMemberRole, VisibilityLevel } from '@prisma/client';
import { prisma } from '../lib/prisma'

/**
 * Create a new chapter
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
export async function createMeeting(
	creatorId: string,
	data: { name: string; description?: string, visibility?: VisibilityLevel }
) {
	return prisma.chapter.create({
	  data: {
	    name: data.name,
	    description: data.description,
	    creatorId,
		visibility: data.visibility,
	    members: {
	      create: {
	        userId: creatorId,
	        role: 'ADMIN',
	      },
	    },
	  },
	  include: {
	    members: true,
	  },
	})
}

/**
 * Get a charter by Id
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
export async function getChapterById(
	id: string,
	includeUsers?: boolean
) {
	return prisma.chapter.findUnique({
	  where: { id },
	  include: {
	    members: {
	      include: {
	        user: !!includeUsers
	      }
	    }
	  },
	})
}

/**
 * Get all of the Chapters that a User belongs to
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
export async function getChaptersByUserId(
	userId: string
) {
	return prisma.chapter.findMany({
	  where: { 
	      members: {
	          some: {
	              userId
	          },
	      }
	  },
	  include: {
	    members: {
			include: {
	        	user: true
	      	}
		}
	  },
	})
}

/** TODO v2
 * Add a User to a Chapter (creates a ChapterMember Junction Object)
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
 * Remove a User to a Chapter
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
 * Creates an Invitation for a Chapter
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function createChapterInvitation(
//     chapterId: string, 
//     invitedEmail: string, 
//     inviterId: string
// ) {
	  
//   const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

//   return prisma.chapterInvitation.create({
//     data: {
//       chapterId,
//       invitedEmail,
//       inviterId,
//       expiresAt
//     }
//   })
// }

/** TODO v2
 * Finds all the Invitations of an Email address
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function getChapterInvitationsByEmail(
//   email: string 
// ) {
//   return prisma.chapterInvitation.findMany({
//     where: { invitedEmail: email }
//   })
// }

/** TODO v2
 * Logic of Accepting a Chapter Invite
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function acceptChapterInvitation(invitationId: string, userId: string) {
//   return prisma.$transaction(async (tx) => {
//     const invitation = await tx.chapterInvitation.findUnique({
//       where: { id: invitationId }
//     })

//     if (!invitation) throw new Error('Invitation not found')

//     await tx.chapterMember.create({
//       data: { userId, chapterId: invitation.chapterId, role: 'MEMBER' }
//     })

//     await tx.chapterInvitation.delete({
//       where: { id: invitationId }
//     })
//   })
// }

/** TODO v2
 * Logic of Rejecting a Chapter Invite
 * Caller is responsible for validating that the creator exists and has proper permissions
 */
// export async function rejectChapterInvitation(
//     id: string
// ) {
//   return prisma.chapterInvitation.delete({
//     where: { id },
//   })
// }


export type UpdateChapterData = {
	name?: string
	description?: string
	visibility?: VisibilityLevel
}

/**
 * Update the name or description of a Chapter
 * Caller is responsible for validating that the user is an admin of the chapter
 */
export async function updateChapter(
	id: string,
	chapterData: UpdateChapterData
) {
	return prisma.chapter.update({
	  where: { id },
	  data: {
	    ...chapterData
	  },
	  include: { members: true },
	})
}

/**
 * Delete a Chapter
 * Caller is responsible for validating that the user is the creator
 */
export async function deleteChapter(
	id: string,
) {
	return prisma.chapter.delete({
	  where: { id },
	})
}

// TODO LATER: getChapterInvitationsByChapter(chapterId: string) - list pending invites for a chapter
