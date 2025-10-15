import { db } from '@/firebase'
import {
  collection, doc, getDocs, setDoc, query, where, serverTimestamp
} from 'firebase/firestore'

/**
 * Create or return an existing chat between two users
 */
export async function startChatWithUser(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return null

  // Check if chat already exists
  const chatQuery = query(
    collection(db, 'chats'),
    where('participants', 'in', [
      [currentUserId, targetUserId],
      [targetUserId, currentUserId]
    ])
  )

  const snap = await getDocs(chatQuery)
  if (!snap.empty) {
    return snap.docs[0].id
  }

  // Else create new chat doc
  const newChatRef = doc(collection(db, 'chats'))
  await setDoc(newChatRef, {
    participants: [currentUserId, targetUserId],
    lastMessage: '',
    updatedAt: serverTimestamp()
  })

  return newChatRef.id
}
