<script>
import { ref, computed, onMounted } from 'vue'
import { collection, getDoc, getDocs, doc, updateDoc, getFirestore, query, orderBy } from 'firebase/firestore'

export default {
    components: {},
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
                const collectionName = item.type === 'feedback' ? 'feedback' : 'issues';
                const docRef = doc(dbInstance, collectionName, item.id);

                // Ensure the document exists before updating
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    throw new Error('Document not found');
                }

                // Update the 'reviewed' field to true
                await updateDoc(docRef, { reviewed: true });

                // Update the item in the UI (local state)
                item.reviewed = true;

                console.log(`Document ${item.id} marked as reviewed successfully.`);

                // Optionally, you can update the UI or show a message
                alert(`Document ${item.id} has been marked as reviewed.`);

            } catch (err) {
                console.error('Error marking reviewed:', err);
                alert('Failed to mark as reviewed. Please try again.');
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
/* Container and page title */
.container {
    color: var(--color-text-primary);
}

h2 {
    color: var(--color-text-primary);
}

:root.dark-mode h2 {
    color: var(--color-text-primary);
}

/* Card styling */
.card {
    transition: all 0.2s ease;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    border-width: 2px;
}

:root.dark-mode .card {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

/* Card borders based on status */
.card.border-success {
    border-color: #28a745 !important;
}

.card.border-danger {
    border-color: #dc3545 !important;
}

:root.dark-mode .card.border-success {
    border-color: #4ade80 !important;
}

:root.dark-mode .card.border-danger {
    border-color: #fb7185 !important;
}

/* Card content */
.card-title {
    color: var(--color-text-primary);
}

.card-subtitle,
.card-text strong,
small.text-muted {
    color: var(--color-text-secondary) !important;
}

:root.dark-mode .card-subtitle,
:root.dark-mode .card-text strong,
:root.dark-mode small.text-muted {
    color: var(--color-text-secondary) !important;
}

.card-text {
    color: var(--color-text-primary);
}

/* Badge styling */
.badge.bg-success {
    background-color: #28a745 !important;
    color: white;
}

:root.dark-mode .badge.bg-success {
    background-color: #3dd365 !important;
    color: #000;
}

/* Empty state text */
p.text-muted {
    color: var(--color-text-secondary) !important;
}

/* Filter buttons */
.all-btn {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: transparent;
    transition: all 0.2s ease;
}

:root.dark-mode .all-btn {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.active-all {
    background-color: var(--color-primary) !important;
    color: #fff !important;
    border-color: var(--color-primary) !important;
}

:root.dark-mode .active-all {
    background-color: var(--color-primary) !important;
    color: #fff !important;
}

.all-btn:focus {
    box-shadow: none;
    outline: none;
    background-color: var(--color-primary);
    color: #fff;
    border-color: var(--color-primary);
}

.all-btn.btn-outline-primary:hover {
    background-color: var(--color-primary);
    color: #fff;
    border-color: var(--color-primary);
}

/* Reviewed button (green) */
.btn-outline-success {
    border-color: #28a745;
    color: #28a745;
    background: transparent;
    transition: all 0.2s ease;
}

:root.dark-mode .btn-outline-success {
    border-color: #3dd365;
    color: #3dd365;
}

.btn-outline-success.active,
.btn-outline-success:hover {
    background-color: #28a745 !important;
    color: #fff !important;
    border-color: #28a745 !important;
}

:root.dark-mode .btn-outline-success.active,
:root.dark-mode .btn-outline-success:hover {
    background-color: #3dd365 !important;
    color: #000 !important;
    border-color: #3dd365 !important;
}

/* Unreviewed button (red) */
.btn-outline-danger {
    border-color: #dc3545;
    color: #dc3545;
    background: transparent;
    transition: all 0.2s ease;
}

:root.dark-mode .btn-outline-danger {
    border-color: #f56e7e;
    color: #f56e7e;
}

.btn-outline-danger.active,
.btn-outline-danger:hover {
    background-color: #dc3545 !important;
    color: #fff !important;
    border-color: #dc3545 !important;
}

:root.dark-mode .btn-outline-danger.active,
:root.dark-mode .btn-outline-danger:hover {
    background-color: #f56e7e !important;
    color: #000 !important;
    border-color: #f56e7e !important;
}

/* Mark as Reviewed button */
.btn-success {
    background-color: #28a745;
    border-color: #28a745;
    color: #fff;
    transition: all 0.2s ease;
}

.btn-success:hover {
    background-color: #218838;
    border-color: #1e7e34;
}

:root.dark-mode .btn-success {
    background-color: #3dd365;
    border-color: #3dd365;
    color: #000;
}

:root.dark-mode .btn-success:hover {
    background-color: #2fc157;
    border-color: #2fc157;
    color: #000;
}
</style>
