<script setup>
import { useRouter } from 'vue-router'
import { auth } from '@/firebase'
import { startChatWithUser } from '../helpers/chathelper.js'

const props = defineProps({
  targetUserId: { type: String, required: true }
})

const router = useRouter()

async function handleStartChat() {
  const currentUser = auth.currentUser
  if (!currentUser) {
    alert('You must be logged in to start a chat.')
    return
  }

  const chatId = await startChatWithUser(currentUser.uid, props.targetUserId)
  if (chatId) {
    router.push({ name: 'chat', query: { chatId } })
  }
}
</script>

<template>
  <button class="btn btn-sm btn-outline-secondary" @click="handleStartChat">
    💬 Chat
  </button>
</template>
