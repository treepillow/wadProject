<script setup>
import { ref, onMounted, watch } from 'vue'
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

const route = useRoute()
const router = useRouter()

const chats = ref([])
const activeChat = ref(null)
const messages = ref([])
const newMessage = ref('')
const currentUserId = ref(null)
const sidebarCollapsed = ref(false)
const userCache = ref({})

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

// 🟣 Populate usernames/photos for sidebar
async function populateUserMeta(chat) {
  if (!chat.participants) return
  chat.meta = chat.meta || {}

  for (const uid of chat.participants) {
    if (uid === currentUserId.value) continue

    if (!userCache.value[uid]) {
      const userSnap = await getDoc(doc(db, 'users', uid))
      if (userSnap.exists()) {
        userCache.value[uid] = userSnap.data()
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
  })
}

// 🟣 Send message
async function sendMessage() {
  if (!newMessage.value.trim() || !activeChat.value) return

  await addDoc(collection(db, `chats/${activeChat.value.id}/messages`), {
    senderId: currentUserId.value,
    text: newMessage.value,
    timestamp: serverTimestamp()
  })

  await setDoc(doc(db, 'chats', activeChat.value.id), {
    lastMessage: newMessage.value,
    updatedAt: serverTimestamp()
  }, { merge: true })

  newMessage.value = ''
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
      router.replace({ query: {} })
    }

    // 4️⃣ Remove from local chats list
    chats.value = chats.value.filter(c => c.id !== chatId)
  } catch (err) {
    console.error('Error deleting chat:', err)
    alert('Failed to delete chat. Please try again.')
  }
}

/* ---- Helpers ---- */
function getOtherUid(chat) {
  if (!currentUserId.value || !chat?.participants) return ''
  return chat.participants.find(u => u !== currentUserId.value) || ''
}
function getOtherName(chat) {
  const otherUid = getOtherUid(chat)
  return chat?.meta?.[otherUid]?.username || 'User'
}
function getOtherAvatar(chat) {
  const otherUid = getOtherUid(chat)
  return chat?.meta?.[otherUid]?.photoURL || 'https://via.placeholder.com/80/aaa'
}
function getActiveTitle() {
  return activeChat.value ? getOtherName(activeChat.value) : ''
}
function getActiveAvatar() {
  return activeChat.value ? getOtherAvatar(activeChat.value) : ''
}
function formatTimestamp(ts) {
  if (!ts) return ''
  const d = ts.toDate()
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}
</script>

<template>
  <div class="chatbox container-fluid rounded-4 mt-4">
    <!-- Top bar -->
    <div class="chat-topbar d-flex justify-content-between align-items-center p-3">
      <button class="toggle-btn" @click="sidebarCollapsed = !sidebarCollapsed">
        {{ sidebarCollapsed ? '📂 Open Chats' : '✖ Close Chats' }}
      </button>
      <div v-if="activeChat" class="active-chat-header d-flex align-items-center">
        <img :src="getActiveAvatar()" class="rounded-circle me-2" width="50" height="50" />
        <h5 class="m-0 flex-grow-1">{{ getActiveTitle() }}</h5>
        <button
          class="btn btn-sm btn-outline-danger ms-3"
          @click="deleteChat(activeChat.id)"
          title="Delete Chat"
        >
          🗑️
        </button>
      </div>
    </div>

    <div class="row g-0 shadow-lg rounded overflow-hidden chat-frame">
      <!-- Sidebar -->
      <div :class="['sidebar col-md-4 p-0 overflow-auto', { collapsed: sidebarCollapsed }]">
        <div
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item d-flex align-items-center p-4 border-bottom"
          @click="selectChat(chat)"
        >
          <img :src="getOtherAvatar(chat)" class="rounded-circle me-3 flex-shrink-0" width="70" height="70" />
          <div class="flex-grow-1">
            <div class="fw-bold fs-5 sidebar-title">{{ getOtherName(chat) }}</div>
            <div class="text-muted small text-truncate-2">{{ chat.lastMessage || 'No messages yet' }}</div>
          </div>
        </div>
      </div>

      <!-- Chat Window -->
      <div :class="['chat-window d-flex flex-column p-0', { expanded: sidebarCollapsed }]">
        <!-- Empty Chat Placeholder -->
        <div
          v-if="!activeChat"
          class="d-flex flex-column justify-content-center align-items-center flex-grow-1 text-muted text-center px-3"
        >
          <h5 class="mb-2">💬 Messages</h5>
          <p class="fs-6">
            Press on a chat from the sidebar to start messaging.
          </p>
        </div>

        <!-- Active Chat -->
        <div v-else class="flex-grow-1 p-4 overflow-auto msg-scroll">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['bubble', msg.senderId === currentUserId ? 'out' : 'in']"
          >
            <div>{{ msg.text }}</div>
            <small class="d-block text-end mt-1" style="font-size:0.75rem;opacity:0.6;">
              {{ formatTimestamp(msg.timestamp) }}
            </small>
          </div>
        </div>

        <!-- Composer -->
        <div v-if="activeChat" class="composer p-3 d-flex align-items-center">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type a message…"
            class="form-control form-control-lg chat-input me-2"
            @keyup.enter="sendMessage"
            autocomplete="off"
          />
          <button class="btn btn-lg btn-primary px-4" @click="sendMessage">Send</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chatbox { width: 100%; background: var(--color-bg-purple-tint); color: var(--color-text-primary); padding: 0; }
.chat-topbar { background: var(--color-bg-purple-tint); border-bottom: 1px solid var(--color-border-purple); }
.toggle-btn { background: var(--color-primary); color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all var(--transition-fast); }
.toggle-btn:hover { background: var(--color-primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
.chat-frame { height: 80vh; background: white; border: 1px solid var(--color-border); border-radius: 12px; display: flex; }
/* Sidebar */
.sidebar { background: var(--color-bg-purple-tint); border-right: 1px solid var(--color-border-purple); transition: all 0.3s ease; display: flex; flex-direction: column; max-width: 350px; }
.sidebar.collapsed { transform: translateX(-100%); width: 0; min-width: 0; }
.chat-item { cursor: pointer; transition: background var(--transition-fast); min-height: 100px; }
.chat-item:hover { background: var(--color-primary-pale); }
.sidebar-title { line-height: 1.4; margin-bottom: 6px; }
.text-truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* Chat Window */
.chat-window { background: #ffffff; flex: 1; display: flex; flex-direction: column; transition: all 0.3s ease; }
.chat-window.expanded { width: 100%; }
.bubble { max-width: 75%; font-size: 1.1rem; padding: 12px 16px; border-radius: 16px; margin: 0 0 12px 0; word-break: break-word; }
.in { background: var(--color-primary-pale); color: var(--color-text-primary); margin-right: auto; }
.out { background: var(--color-primary); color: var(--color-text-white); margin-left: auto; }
.msg-scroll::-webkit-scrollbar { width: 10px; }
.msg-scroll::-webkit-scrollbar-thumb { background: #d4c8ee; border-radius: 6px; }
.msg-scroll::-webkit-scrollbar-thumb:hover { background: #b7a5e5; }
/* Composer */
.composer { background: var(--color-bg-purple-tint); border-top: 1px solid var(--color-border-purple); }
.chat-input { background: var(--color-bg-white); border: 1px solid var(--color-border-purple); border-radius: 14px; }
.chat-input:focus { outline: none; box-shadow: var(--focus-ring); border-color: var(--color-primary); }
.btn-primary { background-color: var(--color-primary); border-color: var(--color-primary); transition: all var(--transition-fast); }
.btn-primary:hover { background-color: var(--color-primary-hover); border-color: var(--color-primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
</style>
