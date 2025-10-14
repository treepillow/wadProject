<script setup>
import { ref, watch, onMounted } from 'vue'

// 🔸 When Firebase is ready, uncomment these:
// import { auth, db } from '@/firebase'
// import { onAuthStateChanged } from 'firebase/auth'
// import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'

const mode = ref('buyer')        // buyer or seller
const chats = ref([])            // list of chats for sidebar
const activeChat = ref(null)     // selected chat
const messages = ref([])         // messages of selected chat
const newMessage = ref('')       // input field
const currentUserId = ref('mock-user-id') // Replace with Firebase auth UID later

watch(mode, () => {
  fetchChats()
})

onMounted(() => {
  // 🔸 When Firebase is ready, replace with onAuthStateChanged(auth, user => ...)
  fetchChats()
})

function fetchChats() {
  // 🔸 Replace this with Firestore query based on mode
  chats.value = [
    {
      id: '1',
      buyerId: 'user_1',
      buyerName: 'Sarah Smith',
      buyerImage: 'https://via.placeholder.com/80/888',
      sellerId: 'biz_1',
      sellerBusinessTitle: "Melly's Bakery",
      sellerBusinessLogo: 'https://via.placeholder.com/80/7a4de8',
      lastMessage: 'Thanks for your order!'
    },
    {
      id: '2',
      buyerId: 'user_2',
      buyerName: 'James Lee',
      buyerImage: 'https://via.placeholder.com/80/777',
      sellerId: 'biz_2',
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

  // 🔸 Replace with Firestore subcollection subscription for messages
  messages.value = [
    { id: 'm1', senderId: currentUserId.value, text: 'hello i book appointment to shave my chest tmr 1pm okay?' },
    { id: 'm2', senderId: 'other-user', text: 'Yeap no problem. See You then 🦊🐰🐻🐿🐧!' }
  ]
}

function sendMessage() {
  if (!newMessage.value.trim() || !activeChat.value) return

  // 🔸 Replace with addDoc(...) to Firestore
  messages.value.push({
    id: `${Date.now()}`,
    senderId: currentUserId.value,
    text: newMessage.value
  })
  newMessage.value = ''
}

// Helper functions to switch between buyer & seller views
function listTitle(chat) {
  return mode.value === 'buyer' ? chat.sellerBusinessTitle : chat.buyerName
}

function listAvatar(chat) {
  return mode.value === 'buyer' ? chat.sellerBusinessLogo : chat.buyerImage
}
</script>

<template>
  <div class="chatbox container-fluid rounded-4 mt-4">
    <!-- Toggle -->
    <div class="text-center pt-3 pb-4">
      <button
        class="btn btn-xl btn-toggle me-3"
        :class="{ active: mode === 'buyer' }"
        @click="mode = 'buyer'"
      >
        👤 Buyer
      </button>
      <button
        class="btn btn-xl btn-toggle"
        :class="{ active: mode === 'seller' }"
        @click="mode = 'seller'"
      >
        🏪 Seller
      </button>
    </div>

    <div class="row g-0 shadow-lg rounded overflow-hidden chat-frame">
      <!-- Sidebar -->
      <div class="col-12 col-md-4 sidebar p-0 overflow-auto">
        <div
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item d-flex align-items-center p-4 border-bottom"
          @click="selectChat(chat)"
        >
          <img :src="listAvatar(chat)" class="rounded-circle me-3 flex-shrink-0" width="84" height="84" />
          <div class="flex-grow-1">
            <div class="fw-bold fs-2 sidebar-title">{{ listTitle(chat) }}</div>
            <div class="text-muted small text-truncate-2">{{ chat.lastMessage }}</div>
          </div>
        </div>
      </div>

      <!-- Conversation -->
      <div class="col-12 col-md-8 d-flex flex-column p-0 chat-window">
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
  max-width: 1400px;
  background: #23232d;
  color: #e9e7f5;
  padding: 0.5rem 1rem 1.5rem;
}

.chat-frame {
  height: 78vh;
}

/* Toggle */
.btn-xl {
  font-size: 1.6rem;
  padding: 16px 42px;
  border-radius: 48px;
}
.btn-toggle {
  background: #c9c2e6;
  color: #1f1f29;
  border: none;
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.btn-toggle:hover {
  transform: translateY(-3px);
}
.btn-toggle.active {
  background: #7a4de8;
  color: #fff;
}

/* Sidebar */
.sidebar {
  background: #2b2b37;
  border-right: 1px solid #3e3e4c;
}
.chat-item {
  cursor: pointer;
  transition: background 0.2s ease;
  min-height: 140px;
}
.chat-item:hover {
  background: #343447;
}
.sidebar-title {
  line-height: 1.25;
  word-break: break-word;
  margin-bottom: 4px;
}
.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Chat Window */
.chat-window {
  background: #242431;
}
.bubble {
  max-width: 75%;
  font-size: 1.2rem;
  padding: 12px 16px;
  border-radius: 16px;
  margin: 0 0 12px 0;
  word-break: break-word;
}
.in {
  background: #eeeeff;
  color: #242431;
  margin-right: auto;
}
.out {
  background: #7a4de8;
  color: #fff;
  margin-left: auto;
}
.msg-scroll::-webkit-scrollbar { width: 10px; }
.msg-scroll::-webkit-scrollbar-thumb { background: #3c3c4b; border-radius: 6px; }
.msg-scroll::-webkit-scrollbar-thumb:hover { background: #56566b; }

/* Composer */
.composer {
  background: #2d2d39;
  border-top: 1px solid #3a3a49;
}
.chat-input {
  background: linear-gradient(145deg, #3a3946, #2f2e3a);
  color: #e9e7f5;
  border: 1px solid #57536d;
  border-radius: 14px;
}
.chat-input::placeholder { color: #c2bcdf; }
.chat-input:focus {
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(122, 77, 232, 0.35);
  border-color: #7a4de8;
}
</style>
