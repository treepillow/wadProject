<script setup>
import { ref, onMounted } from 'vue'

const chats = ref([])
const activeChat = ref(null)
const messages = ref([])
const newMessage = ref('')
const currentUserId = ref('mock-user-id')
const sidebarCollapsed = ref(false)

onMounted(() => {
  fetchChats()
})

function fetchChats() {
  chats.value = [
    {
      id: '1',
      buyerName: 'Sarah Smith',
      buyerImage: 'https://via.placeholder.com/80/888',
      sellerBusinessTitle: "Melly's Bakery",
      sellerBusinessLogo: 'https://via.placeholder.com/80/7a4de8',
      lastMessage: 'Thanks for your order!'
    },
    {
      id: '2',
      buyerName: 'James Lee',
      buyerImage: 'https://via.placeholder.com/80/777',
      sellerBusinessTitle: 'Zen Yoga',
      sellerBusinessLogo: 'https://via.placeholder.com/80/bdb4dd',
      lastMessage: 'See you at class!'
    }
  ]
  if (chats.value.length > 0 && !activeChat.value) {
    selectChat(chats.value[0])
  }
}

function selectChat(chat) {
  activeChat.value = chat
  messages.value = [
    { id: 'm1', senderId: currentUserId.value, text: 'hello i book appointment to shave my chest tmr 1pm okay?' },
    { id: 'm2', senderId: 'other-user', text: 'Yeap no problem. See you then 🦊🐰🐻🐿🐧!' }
  ]
}

function sendMessage() {
  if (!newMessage.value.trim() || !activeChat.value) return
  messages.value.push({
    id: `${Date.now()}`,
    senderId: currentUserId.value,
    text: newMessage.value
  })
  newMessage.value = ''
}

function getSidebarTitle(chat) {
  return `${chat.sellerBusinessTitle} — ${chat.buyerName}`
}

function getSidebarAvatar(chat) {
  return chat.sellerBusinessLogo || chat.buyerImage
}

function getActiveChatTitle() {
  if (!activeChat.value) return ''
  return activeChat.value.sellerBusinessTitle || activeChat.value.buyerName
}

function getActiveChatAvatar() {
  if (!activeChat.value) return ''
  return activeChat.value.sellerBusinessLogo || activeChat.value.buyerImage
}
</script>

<template>
  <div class="chatbox container-fluid rounded-4 mt-4">
    <!-- Always visible top bar with toggle -->
    <div class="chat-topbar d-flex justify-content-between align-items-center p-3">
      <button class="toggle-btn" @click="sidebarCollapsed = !sidebarCollapsed">
        {{ sidebarCollapsed ? '📂 Open Chats' : '✖ Close Chats' }}
      </button>
      <div v-if="activeChat" class="active-chat-header d-flex align-items-center">
        <img :src="getActiveChatAvatar()" class="rounded-circle me-2" width="50" height="50" />
        <h5 class="m-0">{{ getActiveChatTitle() }}</h5>
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
          <img :src="getSidebarAvatar(chat)" class="rounded-circle me-3 flex-shrink-0" width="70" height="70" />
          <div class="flex-grow-1">
            <div class="fw-bold fs-5 sidebar-title">{{ getSidebarTitle(chat) }}</div>
            <div class="text-muted small text-truncate-2">{{ chat.lastMessage }}</div>
          </div>
        </div>
      </div>

      <!-- Conversation -->
      <div :class="['chat-window d-flex flex-column p-0', { expanded: sidebarCollapsed }]">
        <div class="flex-grow-1 p-4 overflow-auto msg-scroll">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['bubble', msg.senderId === currentUserId ? 'out' : 'in']"
          >
            {{ msg.text }}
          </div>
        </div>

        <!-- Composer -->
        <div class="composer p-3 d-flex align-items-center">
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
.toggle-btn:hover {
  background: #693ccc;
}

.chat-frame {
  height: 80vh;
  background: white;
  border: 1px solid #e3e0ec;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
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
.sidebar.collapsed {
  transform: translateX(-100%);
  width: 0;
  min-width: 0;
}

.chat-item {
  cursor: pointer;
  transition: background 0.2s ease;
  min-height: 100px;
}
.chat-item:hover {
  background: #e8e2f3;
}
.sidebar-title {
  line-height: 1.4;
  margin-bottom: 6px;
}
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
.chat-window.expanded {
  width: 100%;
}

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
.composer {
  background: #f3f0f8;
  border-top: 1px solid #e1dbee;
}
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
