<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, db } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  deleteDoc
} from 'firebase/firestore'
import { useDarkMode } from '@/composables/useDarkMode'

// Initialize dark mode
useDarkMode()

const route = useRoute()
const router = useRouter()

const chats = ref([])
const activeChat = ref(null)
const messages = ref([])
const newMessage = ref('')
const currentUserId = ref(null)
const sidebarCollapsed = ref(false)
const userCache = ref({})
const msgScrollContainer = ref(null)

let unsubscribeMsgs = null

// 🟣 Initial auth + chat subscription
onMounted(() => {
  if (auth.currentUser) {
    currentUserId.value = auth.currentUser.uid
    subscribeMyChats()
  }

  onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== currentUserId.value) {
      currentUserId.value = user.uid
      subscribeMyChats()
    }
  })
})

// 🟣 Watch for chatId changes in route
watch(() => route.query.chatId, (newId) => {
  if (!newId) return
  const found = chats.value.find(c => c.id === newId)
  if (found) selectChat(found)
})

// Auto-scroll when messages change
watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

// 🟣 Subscribe to the user's chat list
function subscribeMyChats() {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', currentUserId.value),
    orderBy('updatedAt', 'desc')
  )

  onSnapshot(q, async (snap) => {
    let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Populate usernames/photos
    for (const chat of rows) {
      await populateUserMeta(chat)
    }

    chats.value = rows

    const targetId = route.query.chatId
    if (targetId) {
      const found = rows.find(c => c.id === targetId)
      if (found) {
        selectChat(found)
        return
      }
    }

    // Auto-select most recent chat if none is selected
    if (!activeChat.value && rows.length > 0) {
      selectChat(rows[0])
    }
  })
}

// 🟣 Populate usernames/photos for sidebar - check multiple fields like Profile.vue
async function populateUserMeta(chat) {
  if (!chat.participants) return
  chat.meta = chat.meta || {}

  for (const uid of chat.participants) {
    if (uid === currentUserId.value) continue

    if (!userCache.value[uid]) {
      const userSnap = await getDoc(doc(db, 'users', uid))
      if (userSnap.exists()) {
        const userData = userSnap.data()
        // Check multiple photo fields like in Profile.vue
        const photoURL = userData.photoURL || userData.profilePicture || userData.avatarUrl || userData.profilePhoto || ''
        const displayName = userData.username || userData.displayName || userData.firstName || 'User'
        userCache.value[uid] = {
          ...userData,
          photoURL,
          displayName
        }
      }
    }

    chat.meta[uid] = userCache.value[uid]
  }
}

// 🟣 Select chat + subscribe to messages
function selectChat(chat) {
  activeChat.value = chat

  router.replace({ query: { chatId: chat.id } })

  if (unsubscribeMsgs) {
    unsubscribeMsgs()
    unsubscribeMsgs = null
  }

  const q = query(
    collection(db, `chats/${chat.id}/messages`),
    orderBy('timestamp', 'asc')
  )
  unsubscribeMsgs = onSnapshot(q, (snap) => {
    messages.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    nextTick(() => scrollToBottom())
  })
}

// 🟣 Send message
async function sendMessage() {
  if (!newMessage.value.trim() || !activeChat.value) return

  const messageText = newMessage.value.trim()
  newMessage.value = '' // Clear immediately for better UX

  await addDoc(collection(db, `chats/${activeChat.value.id}/messages`), {
    senderId: currentUserId.value,
    text: messageText,
    timestamp: serverTimestamp()
  })

  await setDoc(doc(db, 'chats', activeChat.value.id), {
    lastMessage: messageText,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

// 🟣 Delete chat with confirmation
async function deleteChat(chatId) {
  const confirmed = window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')
  if (!confirmed) return

  try {
    // 1️⃣ Delete all messages
    const messagesRef = collection(db, `chats/${chatId}/messages`)
    const messagesSnap = await getDocs(messagesRef)
    for (const msg of messagesSnap.docs) {
      await deleteDoc(msg.ref)
    }

    // 2️⃣ Delete chat document
    await deleteDoc(doc(db, 'chats', chatId))

    // 3️⃣ Clear active chat if it was deleted
    if (activeChat.value && activeChat.value.id === chatId) {
      activeChat.value = null
      messages.value = []
      router.replace({ query: {} })
    }

    // 4️⃣ Remove from local chats list
    chats.value = chats.value.filter(c => c.id !== chatId)
  } catch (err) {
    console.error('Error deleting chat:', err)
    alert('Failed to delete chat. Please try again.')
  }
}

// Scroll to bottom of messages
function scrollToBottom() {
  if (msgScrollContainer.value) {
    msgScrollContainer.value.scrollTop = msgScrollContainer.value.scrollHeight
  }
}

/* ---- Helpers ---- */
function getOtherUid(chat) {
  if (!currentUserId.value || !chat?.participants) return ''
  return chat.participants.find(u => u !== currentUserId.value) || ''
}

function getOtherName(chat) {
  const otherUid = getOtherUid(chat)
  const meta = chat?.meta?.[otherUid]
  return meta?.displayName || meta?.username || 'User'
}

function getOtherAvatar(chat) {
  const otherUid = getOtherUid(chat)
  const photoURL = chat?.meta?.[otherUid]?.photoURL
  // Use proper fallback with UI Avatars
  if (!photoURL) {
    const name = getOtherName(chat)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ECE8FF&color=4b2aa6&size=128`
  }
  return photoURL
}

function getActiveTitle() {
  return activeChat.value ? getOtherName(activeChat.value) : ''
}

function getActiveAvatar() {
  return activeChat.value ? getOtherAvatar(activeChat.value) : ''
}

function formatTime(ts) {
  if (!ts) return ''
  const d = ts.toDate()
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })
}

function formatMessageTime(ts) {
  if (!ts) return ''
  const d = ts.toDate()
  return d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true })
}
</script>

<template>
  <div class="chatbox-container">
    <!-- Carousell-style two-column layout -->
    <div class="chat-layout">
      <!-- Left Sidebar: Conversations List -->
      <div :class="['conversations-sidebar', { collapsed: sidebarCollapsed }]">
        <div class="sidebar-header">
          <h4 class="sidebar-title">Messages</h4>
          <button
            class="toggle-sidebar-btn d-md-none"
            @click="sidebarCollapsed = !sidebarCollapsed"
            :title="sidebarCollapsed ? 'Show chats' : 'Hide chats'"
          >
            {{ sidebarCollapsed ? '☰' : '✕' }}
          </button>
        </div>

        <div class="conversations-list">
          <div
            v-for="chat in chats"
            :key="chat.id"
            :class="['conversation-item', { active: activeChat?.id === chat.id }]"
            @click="selectChat(chat); sidebarCollapsed = true"
          >
            <div class="avatar-wrapper">
              <img
                :src="getOtherAvatar(chat)"
                :alt="getOtherName(chat)"
                class="user-avatar"
                @error="$event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getOtherName(chat))}&background=ECE8FF&color=4b2aa6&size=128`"
              />
            </div>
            <div class="conversation-details">
              <div class="conversation-header">
                <span class="user-name">{{ getOtherName(chat) }}</span>
                <span class="time-ago">{{ formatTime(chat.updatedAt) }}</span>
              </div>
              <p class="last-message">{{ chat.lastMessage || 'No messages yet' }}</p>
            </div>
          </div>

          <div v-if="chats.length === 0" class="empty-state">
            <p class="text-muted">No conversations yet</p>
          </div>
        </div>
      </div>

      <!-- Right Panel: Active Chat -->
      <div class="chat-panel">
        <!-- Empty State -->
        <div v-if="!activeChat" class="empty-chat-state">
          <div class="empty-content">
            <div class="empty-icon">💬</div>
            <h5>Select a chat to start messaging</h5>
            <p class="text-muted">Choose a conversation from the list</p>
          </div>
        </div>

        <!-- Active Chat -->
        <div v-else class="active-chat">
          <!-- Chat Header -->
          <div class="chat-header">
            <button
              class="back-btn d-md-none"
              @click="sidebarCollapsed = false; activeChat = null; router.replace({ query: {} })"
            >
              ← Back
            </button>
            <div class="chat-user-info">
              <img
                :src="getActiveAvatar()"
                :alt="getActiveTitle()"
                class="chat-user-avatar"
                @error="$event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getActiveTitle())}&background=ECE8FF&color=4b2aa6&size=128`"
              />
              <div class="chat-user-details">
                <h5 class="chat-user-name">{{ getActiveTitle() }}</h5>
              </div>
            </div>
            <button
              class="delete-chat-btn"
              @click="deleteChat(activeChat.id)"
              title="Delete conversation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>

          <!-- Messages Area -->
          <div class="messages-container" ref="msgScrollContainer">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['message-wrapper', msg.senderId === currentUserId ? 'sent' : 'received']"
            >
              <div class="message-bubble">
                <p class="message-text">{{ msg.text }}</p>
                <span class="message-time">{{ formatMessageTime(msg.timestamp) }}</span>
              </div>
            </div>

            <div v-if="messages.length === 0" class="no-messages">
              <p class="text-muted">Start the conversation!</p>
            </div>
          </div>

          <!-- Message Input -->
          <div class="message-input-container">
            <div class="input-wrapper">
              <input
                v-model="newMessage"
                type="text"
                placeholder="Type a message..."
                class="message-input"
                @keyup.enter="sendMessage"
                autocomplete="off"
              />
              <button
                class="send-btn"
                @click="sendMessage"
                :disabled="!newMessage.trim()"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chatbox-container {
  width: 100%;
  background: var(--color-bg-main);
  padding: 0;
}

.chat-layout {
  display: flex;
  height: 80vh;
  max-height: 800px;
  background: var(--color-bg-white);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

/* ===== LEFT SIDEBAR ===== */
.conversations-sidebar {
  width: 380px;
  min-width: 380px;
  background: var(--color-bg-white);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.sidebar-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-bg-white);
}

.sidebar-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-primary);
  cursor: pointer;
  padding: 0.25rem;
  display: none;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg-white);
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--color-border);
  gap: 1rem;
}

.conversation-item:hover {
  background: var(--color-bg-purple-tint);
}

.conversation-item.active {
  background: var(--color-primary-pale);
  border-left: 3px solid var(--color-primary);
}

.avatar-wrapper {
  flex-shrink: 0;
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.conversation-details {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.user-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-ago {
  font-size: 0.813rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.last-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
}

.text-muted {
  color: var(--color-text-secondary) !important;
}

/* ===== RIGHT PANEL ===== */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-main);
}

.empty-chat-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.empty-content {
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-content h5 {
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.active-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Chat Header */
.chat-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--color-bg-white);
  border-bottom: 1px solid var(--color-border);
  gap: 1rem;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem;
  display: none;
}

.chat-user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.chat-user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.chat-user-details {
  flex: 1;
}

.chat-user-name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.delete-chat-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.delete-chat-btn:hover {
  color: var(--color-error);
  background: rgba(220, 53, 69, 0.1);
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--color-bg-main);
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-dark);
}

.message-wrapper {
  display: flex;
  margin-bottom: 0.5rem;
}

.message-wrapper.received {
  justify-content: flex-start;
}

.message-wrapper.sent {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 65%;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  position: relative;
}

.received .message-bubble {
  background: var(--color-bg-white);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-bottom-left-radius: 4px;
}

.sent .message-bubble {
  background: var(--color-primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-text {
  margin: 0;
  font-size: 0.938rem;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-time {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  opacity: 0.7;
  text-align: right;
}

.no-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* Message Input */
.message-input-container {
  padding: 1rem 1.5rem;
  background: var(--color-bg-white);
  border-top: 1px solid var(--color-border);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--color-bg-main);
  border: 2px solid var(--color-border);
  border-radius: 24px;
  padding: 0.5rem 0.75rem;
  transition: border-color 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: var(--color-primary);
}

.message-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.5rem;
  font-size: 0.938rem;
  color: var(--color-text-primary);
  outline: none;
}

.message-input::placeholder {
  color: var(--color-text-secondary);
}

.send-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 991.98px) {
  .conversations-sidebar {
    width: 320px;
    min-width: 320px;
  }

  .sidebar-header {
    padding: 1rem 1.25rem;
  }

  .conversation-item {
    padding: 0.875rem 1.25rem;
  }

  .user-avatar {
    width: 50px;
    height: 50px;
  }
}

@media (max-width: 767.98px) {
  .chat-layout {
    height: 75vh;
  }

  .conversations-sidebar {
    position: absolute;
    width: 100%;
    max-width: 100%;
    min-width: 100%;
    height: 100%;
    z-index: 10;
    transition: transform 0.3s ease;
  }

  .conversations-sidebar.collapsed {
    transform: translateX(-100%);
  }

  .toggle-sidebar-btn,
  .back-btn {
    display: block;
  }

  .chat-header {
    padding: 0.875rem 1rem;
  }

  .messages-container {
    padding: 1rem;
  }

  .message-bubble {
    max-width: 80%;
  }

  .message-input-container {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 575.98px) {
  .chat-layout {
    height: 70vh;
    border-radius: 8px;
  }

  .sidebar-title {
    font-size: 1.25rem;
  }

  .conversation-item {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 48px;
    height: 48px;
  }

  .user-name {
    font-size: 0.938rem;
  }

  .last-message {
    font-size: 0.813rem;
  }

  .chat-user-avatar {
    width: 40px;
    height: 40px;
  }

  .chat-user-name {
    font-size: 1rem;
  }

  .message-text {
    font-size: 0.875rem;
  }

  .message-time {
    font-size: 0.688rem;
  }

  .send-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
