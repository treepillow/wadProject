<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { auth, db } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, doc, setDoc, serverTimestamp, getDoc
} from 'firebase/firestore'

const route = useRoute()

const chats = ref([])
const activeChat = ref(null)
const messages = ref([])
const newMessage = ref('')
const currentUserId = ref(null)
const sidebarCollapsed = ref(false)
const userCache = ref({}) // cache user data so we don't refetch unnecessarily

let unsubscribeMsgs = null

onMounted(() => {
  // If already logged in (e.g. navigated from navbar)
  if (auth.currentUser) {
    currentUserId.value = auth.currentUser.uid
    subscribeMyChats()   // 👉 immediately fetch chats
  }

  // Also listen for auth state changes
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== currentUserId.value) {
      currentUserId.value = user.uid
      subscribeMyChats()
    }
  })
})

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

  // ✅ NEW: Only show chats that have started (i.e. have a non-empty lastMessage)
  rows = rows.filter(c => c.lastMessage && c.lastMessage.trim() !== '')

  chats.value = rows

  const targetId = route.query.chatId
  if (targetId) {
    const found = rows.find(c => c.id === targetId)
    if (found) {
      selectChat(found)
      return
    }
  }

  // ✅ Auto-select the most recent chat if there's no chatId

})

}

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

import { useRouter } from 'vue-router'
const router = useRouter()

function selectChat(chat) {
  activeChat.value = chat

  // ✅ Keep the URL updated for refreshing/sharing
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

/* ---- Timestamp formatting ---- */
function formatTimestamp(ts) {
  if (!ts) return ''
  const d = ts.toDate()
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}
</script>

<template>
  <div class="chatbox container-fluid rounded-4 mt-4">
    <!-- Sticky top bar -->
    <div class="chat-topbar d-flex justify-content-between align-items-center p-3">
      <button class="toggle-btn" @click="sidebarCollapsed = !sidebarCollapsed">
        {{ sidebarCollapsed ? '📂 Open Chats' : '✖ Close Chats' }}
      </button>
      <div v-if="activeChat" class="active-chat-header d-flex align-items-center">
        <img :src="getActiveAvatar()" class="rounded-circle me-2" width="50" height="50" />
        <h5 class="m-0">{{ getActiveTitle() }}</h5>
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
            <div class="text-muted small text-truncate-2">{{ chat.lastMessage }}</div>
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


        <!-- Active Chat Messages -->
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
.chatbox {
  width: 100%;
  max-width: 100%;
  background: #f8f5fb;
  color: #2d2d2d;
  padding: 0;
}
.chat-topbar {
  background: #f3f0f8;
  border-bottom: 1px solid #e1dbee;
}
.toggle-btn {
  background: #7a4de8;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}
.toggle-btn:hover { background: #693ccc; }
.chat-frame {
  height: 80vh;
  background: white;
  border: 1px solid #e3e0ec;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
}
/* Sidebar */
.sidebar {
  background: #f3f0f8;
  border-right: 1px solid #e1dbee;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  max-width: 350px;
}
.sidebar.collapsed { transform: translateX(-100%); width: 0; min-width: 0; }
.chat-item { cursor: pointer; transition: background 0.2s ease; min-height: 100px; }
.chat-item:hover { background: #e8e2f3; }
.sidebar-title { line-height: 1.4; margin-bottom: 6px; }
.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* Chat Window */
.chat-window {
  background: #ffffff;
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}
.chat-window.expanded { width: 100%; }
.bubble {
  max-width: 75%;
  font-size: 1.1rem;
  padding: 12px 16px;
  border-radius: 16px;
  margin: 0 0 12px 0;
  word-break: break-word;
}
.in {
  background: #e9e4f5;
  color: #3a2e5c;
  margin-right: auto;
}
.out {
  background: #7a4de8;
  color: #fff;
  margin-left: auto;
}
.msg-scroll::-webkit-scrollbar { width: 10px; }
.msg-scroll::-webkit-scrollbar-thumb { background: #d4c8ee; border-radius: 6px; }
.msg-scroll::-webkit-scrollbar-thumb:hover { background: #b7a5e5; }
/* Composer */
.composer { background: #f3f0f8; border-top: 1px solid #e1dbee; }
.chat-input {
  background: #fff;
  color: #2d2d2d;
  border: 1px solid #d5caee;
  border-radius: 14px;
}
.chat-input::placeholder { color: #9b8dc6; }
.chat-input:focus {
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(122, 77, 232, 0.25);
  border-color: #7a4de8;
}
.btn-primary {
  background-color: #7a4de8;
  border-color: #7a4de8;
}
.btn-primary:hover {
  background-color: #693ccc;
  border-color: #693ccc;
}
</style>
