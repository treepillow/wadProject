import { ref, computed } from 'vue'
import { auth, db } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore'

const unreadCount = ref(0)
let unsubscribeChats = null
let currentUserId = null
const chatUnreadCounts = ref({}) // chatId -> count

export function useMessageNotifications() {
  
  async function calculateUnreadCount() {
    if (!currentUserId) {
      unreadCount.value = 0
      return
    }
    
    try {
      // Get all chats for current user
      const chatsRef = collection(db, 'chats')
      const chatsQuery = query(chatsRef, where('participants', 'array-contains', currentUserId))
      const chatsSnap = await getDocs(chatsQuery)
      
      let totalUnread = 0
      const chatIds = []
      
      chatsSnap.forEach((chatDoc) => {
        chatIds.push(chatDoc.id)
      })
      
      // For each chat, count unread messages
      for (const chatId of chatIds) {
        const count = await countUnreadInChat(chatId)
        chatUnreadCounts.value[chatId] = count
        totalUnread += count
      }
      
      unreadCount.value = totalUnread
    } catch (error) {
      console.error('Error calculating unread count:', error)
      unreadCount.value = 0
    }
  }
  
  async function countUnreadInChat(chatId) {
    if (!currentUserId || !chatId) return 0
    
    try {
      // Get last read timestamp for this chat
      const readDocRef = doc(db, 'chats', chatId, 'readStatus', currentUserId)
      const readSnap = await getDoc(readDocRef)
      const lastRead = readSnap.exists() ? readSnap.data().lastReadAt : null
      
      // Get all messages in this chat
      const messagesRef = collection(db, `chats/${chatId}/messages`)
      const messagesSnap = await getDocs(messagesRef)
      
      let count = 0
      const lastReadTime = lastRead?.toDate ? lastRead.toDate() : (lastRead?.seconds ? new Date(lastRead.seconds * 1000) : null)
      
      messagesSnap.forEach((msgDoc) => {
        const msg = msgDoc.data()
        // Count messages not sent by current user
        if (msg.senderId !== currentUserId) {
          const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate() : (msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000) : new Date())
          
          // If never read, or message is after last read time
          if (!lastReadTime || msgTime > lastReadTime) {
            count++
          }
        }
      })
      
      return count
    } catch (error) {
      console.warn('Error counting unread in chat:', chatId, error)
      return 0
    }
  }
  
  function startListening() {
    if (!auth.currentUser) return
    
    currentUserId = auth.currentUser.uid
    calculateUnreadCount()
    
    // Listen to all chats where user is a participant
    const chatsRef = collection(db, 'chats')
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', currentUserId))
    
    unsubscribeChats = onSnapshot(chatsQuery, async (snap) => {
      // When chats change, recalculate unread count
      await calculateUnreadCount()
      
      // Also set up listeners for message changes in each chat
      const chatIds = snap.docs.map(doc => doc.id)
      
      // Count unread for all chats
      const counts = await Promise.all(chatIds.map(chatId => countUnreadInChat(chatId)))
      chatIds.forEach((chatId, index) => {
        chatUnreadCounts.value[chatId] = counts[index]
      })
      
      // Recalculate total
      const total = Object.values(chatUnreadCounts.value).reduce((sum, c) => sum + c, 0)
      unreadCount.value = total
    })
    
    // Listen for auth changes
    onAuthStateChanged(auth, (user) => {
      if (user && user.uid !== currentUserId) {
        if (unsubscribeChats) unsubscribeChats()
        currentUserId = user.uid
        chatUnreadCounts.value = {}
        startListening()
      } else if (!user) {
        if (unsubscribeChats) unsubscribeChats()
        unreadCount.value = 0
        chatUnreadCounts.value = {}
        currentUserId = null
      }
    })
  }
  
  function stopListening() {
    if (unsubscribeChats) {
      unsubscribeChats()
      unsubscribeChats = null
    }
    unreadCount.value = 0
    chatUnreadCounts.value = {}
  }
  
  async function markChatAsRead(chatId) {
    if (!currentUserId || !chatId) return
    
    try {
      const readDocRef = doc(db, 'chats', chatId, 'readStatus', currentUserId)
      await setDoc(readDocRef, {
        lastReadAt: serverTimestamp()
      }, { merge: true })
      
      // Update local count immediately
      chatUnreadCounts.value[chatId] = 0
      const total = Object.values(chatUnreadCounts.value).reduce((sum, c) => sum + c, 0)
      unreadCount.value = total
      
      // Recalculate to ensure accuracy
      await calculateUnreadCount()
    } catch (error) {
      console.error('Error marking chat as read:', error)
    }
  }
  
  return {
    unreadCount: computed(() => unreadCount.value),
    startListening,
    stopListening,
    markChatAsRead,
    countUnreadInChat
  }
}
