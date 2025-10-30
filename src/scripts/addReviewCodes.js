import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'

// Your Firebase config - update with your actual config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

function generateReviewCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'REVIEW-'

  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return code
}

async function addReviewCodesToListings() {
  try {
    console.log('Starting migration: Adding review codes to listings...')

    const listingsRef = collection(db, 'allListings')
    const snapshot = await getDocs(listingsRef)

    let updated = 0
    let skipped = 0

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()

      if (!data.reviewCode) {
        const reviewCode = generateReviewCode()
        await updateDoc(doc(db, 'allListings', docSnap.id), {
          reviewCode
        })
        console.log(`✓ Added review code to listing: ${data.businessName} (${docSnap.id}) - Code: ${reviewCode}`)
        updated++
      } else {
        console.log(`- Skipped listing: ${data.businessName} (already has review code)`)
        skipped++
      }
    }

    console.log('\n=== Migration Complete ===')
    console.log(`Updated: ${updated} listings`)
    console.log(`Skipped: ${skipped} listings (already had codes)`)
    console.log(`Total: ${snapshot.size} listings`)

  } catch (error) {
    console.error('Error during migration:', error)
  }
}

// Run the migration
addReviewCodesToListings().then(() => {
  console.log('\nMigration finished. You can now close this script.')
  process.exit(0)
})
