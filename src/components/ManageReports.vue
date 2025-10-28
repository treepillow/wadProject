<script>
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs, doc, updateDoc, getFirestore, query, orderBy } from 'firebase/firestore'
import NavBar from './NavBar.vue';

export default {
    components: {NavBar},
    setup() {
        const submissions = ref([])
        const filter = ref('all')
        const dbInstance = getFirestore()

        const fetchSubmissions = async () => {
            const qFeedback = query(collection(dbInstance, 'feedback'), orderBy('createdAt', 'desc'))
            const qIssues = query(collection(dbInstance, 'issues'), orderBy('createdAt', 'desc'))

            const feedbackSnapshot = await getDocs(qFeedback)
            const issuesSnapshot = await getDocs(qIssues)

            const feedbacks = feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'feedback' }))
            const issues = issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'issue' }))

            submissions.value = [...feedbacks, ...issues].sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds || 0)
        }

        const markReviewed = async (item) => {
            try {
                const collectionName = item.type === 'feedback' ? 'feedback' : 'issues'
                const docRef = doc(dbInstance, collectionName, item.id)
                await updateDoc(docRef, { reviewed: true })
                item.reviewed = true
            } catch (err) {
                console.error('Error marking reviewed:', err)
            }
        }

        const formatDate = (timestamp) => {
            if (!timestamp) return ''
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
            return date.toLocaleString()
        }

        const filteredSubmissions = computed(() => {
            if (filter.value === 'all') return submissions.value
            if (filter.value === 'reviewed') return submissions.value.filter(s => s.reviewed)
            if (filter.value === 'unreviewed') return submissions.value.filter(s => !s.reviewed)
            return submissions.value
        })

        onMounted(fetchSubmissions)

        return { submissions, filteredSubmissions, filter, markReviewed, formatDate }
    }
}
</script>

<template>
    <NavBar/>
    <div class="container my-5">
        <h2 class="text-center mb-4">User Feedback & Reported Issues</h2>

        <!-- Filter Buttons -->
        <div class="d-flex justify-content-center mb-4">
            <button class="btn all-btn me-2" :class="filter === 'all' ? 'active-all' : 'btn-outline-primary'"
                @click="filter = 'all'">
                All
            </button>
            <button class="btn btn-outline-success me-2" :class="filter === 'reviewed' ? 'active' : ''"
                @click="filter = 'reviewed'">
                Reviewed
            </button>
            <button class="btn btn-outline-danger" :class="filter === 'unreviewed' ? 'active' : ''"
                @click="filter = 'unreviewed'">
                Unreviewed
            </button>
        </div>

        <div class="row g-3">
            <div v-if="filteredSubmissions.length === 0" class="col-12">
                <p class="text-muted text-center">No submissions to display.</p>
            </div>

            <div v-for="doc in filteredSubmissions" :key="doc.id" class="col-12">
                <div :class="['card', doc.reviewed ? 'border-success' : 'border-danger']">
                    <div class="card-body d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title">
                                {{ doc.type === 'feedback' ? 'Feedback' : 'Report Issue' }}
                                <span v-if="doc.reviewed" class="badge bg-success ms-2">Reviewed</span>
                            </h5>
                            <h6 class="card-subtitle mb-2 text-muted">
                                {{ doc.name }} | {{ doc.email }} | {{ doc.phone }}
                            </h6>
                            <p class="card-text">
                                <strong>Context / Category:</strong> {{ doc.context }}<br />
                                <strong>Description:</strong> {{ doc.description }}
                            </p>
                            <small class="text-muted">
                                Submitted on: {{ formatDate(doc.createdAt) }}
                            </small>
                        </div>
                        <button v-if="!doc.reviewed" class="btn btn-success" @click="markReviewed(doc)">
                            Mark as Reviewed
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.card {
    transition: all 0.2s ease;
}

.card:hover {
    transform: translateY(-2px);
}

.all-btn {
    border-color: #6f42c1;
    color: #6f42c1;
}

.active-all {
    background-color: #6f42c1;
    color: #fff;
    border-color: #6f42c1;
}

.all-btn:focus {
    box-shadow: none;
    outline: none;
    background-color: #6f42c1;
    color: #fff;
    border-color: #6f42c1;
}

.all-btn.btn-outline-primary:hover {
    background-color: #6f42c1;
    color: #fff;
    border-color: #6f42c1;
}
</style>
