<script>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'
import {
  getFirestore, doc, getDoc, updateDoc, serverTimestamp,
  collection, getDocs, query, orderBy, where,
  onSnapshot, getCountFromServer, setDoc, deleteDoc, addDoc
} from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { useDarkMode } from '@/composables/useDarkMode'
import { useToast } from '@/composables/useToast'
import { generateQRCode, downloadQRCode } from '@/utils/reviewCode'
import { Icon } from '@iconify/vue'

import ListingCard from '@/components/ListingCard.vue'
import ListingDrawer from '@/components/ListingDrawer.vue'  // <-- NEW

const auth = getAuth()
const db = getFirestore()
const storage = getStorage()

export default {
  name: 'Profile',
  components: { RouterLink, ListingCard, ListingDrawer, Icon }, // <-- add Icon

  setup() {
    // Initialize dark mode
    useDarkMode()

    // Get route and router
    const route = useRoute()
    const router = useRouter()
    const toast = useToast()

    /* ---------------- Status ---------------- */
    const loading = ref(true)
    const saving = ref(false)
    const err = ref('')
    const ok = ref('')

    /* ---------------- User + Profile ---------------- */
    const user = ref(null)

    const avatarUrl = ref('')
    const avatarFile = ref(null)
    const avatarLoaded = ref(false)
    const firstName = ref('')
    const lastName = ref('')
    const username = ref('')
    const email = ref('')
    const phone = ref('')
    const dateOfBirth = ref('')   // ISO for <input type="date">
    const address = ref('')
    const addressObj = ref(null)
    const averageRating = ref(0)
    const totalReviews = ref(0)
    const instagramId = ref('')
    const telegramId = ref('')

    const displayName = computed(() => {
      const f = (firstName.value || '').trim()
      const l = (lastName.value || '').trim()
      return (f || l) ? `${f} ${l}`.trim() : (username.value || '—')
    })

    /* ---------------- Listings + Likes ---------------- */
    const myListings = ref([])
    const myLoading = ref(false)
    const likedListings = ref([])
    const likedLoading = ref(false)
    const likedLoaded = ref(false) // Track if we've attempted to load liked listings

    const likedSet = ref(new Set())
    const likeCounts = ref({})

    /* ---------------- Booking Requests ---------------- */
    const bookingRequests = ref([])
    const bookingsLoading = ref(false)
    const bookingsLoaded = ref(false)

    /* ---------------- Tabs (after state declarations) ---------------- */
    const activeTab = ref('profile') // 'profile' | 'my' | 'liked' | 'bookings'
    const openTab = (t) => {
      activeTab.value = t
      if (t === 'liked' && !likedLoaded.value) loadLikedListings()
      if (t === 'bookings' && !bookingsLoaded.value) loadBookingRequests()
    }

    // Watch for route query changes and set active tab
    watch(() => route.query.tab, (newTab) => {
      if (newTab === 'my' || newTab === 'liked' || newTab === 'profile' || newTab === 'bookings') {
        openTab(newTab)
      }
    }, { immediate: true })

    // Live seller profiles (username/avatar)
    const profileMap = ref({})
    const profileUnsubs = new Map()
    function startProfileListener(uid) {
      if (!uid || profileUnsubs.has(uid)) return
      const unsub = onSnapshot(doc(db, 'users', uid), snap => {
        const data = snap.data() || {}
        const displayName = data.username || data.displayName || ''
        const photoURL = data.photoURL || data.avatarUrl || data.profilePhoto || ''
        profileMap.value = { ...profileMap.value, [uid]: { displayName, photoURL } }
      })
      profileUnsubs.set(uid, unsub)
    }
    function attachProfileListeners(rows) {
      const uids = new Set(rows.map(r => r.userId).filter(Boolean))
      uids.forEach(startProfileListener)
    }

    /* ---------------- Batch reveal (My) ---------------- */
    const revealedMy = ref(new Set())
    let myBatchIds = []
    const myBatchTotal = ref(0)
    const myBatchLoaded = ref(0)
    const myCounted = new Set()

    /* ---------------- Batch reveal (Liked) ---------------- */
    const revealedLiked = ref(new Set())
    let likedBatchIds = []
    const likedBatchTotal = ref(0)
    const likedBatchLoaded = ref(0)
    const likedCounted = new Set()

    function hasPhoto(l) {
      return Boolean(
        (Array.isArray(l.photoUrls) && l.photoUrls[0]) ||
        (Array.isArray(l.photos) && l.photos[0]?.url) ||
        l.photoUrl || l.coverPhoto || l.image
      )
    }

    function prepMyBatch(rows) {
      myBatchIds = rows.map(r => r.listingId || r.id)
      myBatchTotal.value = rows.filter(hasPhoto).length
      myBatchLoaded.value = 0
      myCounted.clear()
      // Hide all until batch completes
      revealedMy.value = new Set()
      if (myBatchTotal.value === 0) revealMy(myBatchIds)
    }
    function revealMy(ids) {
      const s = new Set(revealedMy.value)
      ids.forEach(id => s.add(id))
      revealedMy.value = s
      myBatchIds = []
      myBatchTotal.value = 0
      myBatchLoaded.value = 0
      myCounted.clear()
    }
    function handleMyImageLoaded(id) {
      if (!myBatchIds.includes(id) || myCounted.has(id)) return
      myCounted.add(id)
      myBatchLoaded.value++
      if (myBatchLoaded.value >= myBatchTotal.value && myBatchTotal.value > 0) {
        revealMy(myBatchIds)
      }
    }

    function prepLikedBatch(rows) {
      likedBatchIds = rows.map(r => r.listingId || r.id)
      likedBatchTotal.value = rows.filter(hasPhoto).length
      likedBatchLoaded.value = 0
      likedCounted.clear()
      revealedLiked.value = new Set()
      if (likedBatchTotal.value === 0) revealLiked(likedBatchIds)
    }
    function revealLiked(ids) {
      const s = new Set(revealedLiked.value)
      ids.forEach(id => s.add(id))
      revealedLiked.value = s
      likedBatchIds = []
      likedBatchTotal.value = 0
      likedBatchLoaded.value = 0
      likedCounted.clear()
    }
    function handleLikedImageLoaded(id) {
      if (!likedBatchIds.includes(id) || likedCounted.has(id)) return
      likedCounted.add(id)
      likedBatchLoaded.value++
      if (likedBatchLoaded.value >= likedBatchTotal.value && likedBatchTotal.value > 0) {
        revealLiked(likedBatchIds)
      }
    }

    /* ---------------- Helpers ---------------- */
    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size))
    const normPhone = (v) => {
      const s = (v || '').trim().replace(/\s+/g, '')
      if (/^\+65\d{8}$/.test(s)) return s
      if (/^\d{8}$/.test(s)) return `+65${s}`
      return s
    }
    const normalizePhotos = (obj) => {
      if (!obj) return obj
      let urls = []
      if (Array.isArray(obj.photoUrls) && obj.photoUrls.length) {
        urls = [...obj.photoUrls]
      } else if (Array.isArray(obj.photos) && obj.photos.length) {
        urls = obj.photos.map(p => p?.url).filter(Boolean)
      }
      // de-dupe by URL
      const seen = new Set()
      obj.photoUrls = urls.filter(u => u && !seen.has(u) && (seen.add(u), true))
      return obj
    }

    async function fetchLikesCount(listingId) {
      try {
        const colRef = collection(db, 'listingLikes', listingId, 'users')
        const snap = await getCountFromServer(colRef)
        likeCounts.value = { ...likeCounts.value, [listingId]: snap.data().count || 0 }
      } catch (e) {
        console.warn('likes count error:', listingId, e)
      }
    }

    function startLikesListener(uid) {
      if (unsubLikes) { unsubLikes(); unsubLikes = null }
      likedSet.value = new Set()
      if (!uid) return
      const colRef = collection(db, 'users', uid, 'likedListings')
      unsubLikes = onSnapshot(colRef, snap => {
        const s = new Set()
        snap.forEach(d => s.add(d.id))
        likedSet.value = s
      })
    }

    /* ---------------- Mount: load profile & my listings ---------------- */
    let unsubLikes = null
    let unsubMyListings = null
    let unsubUserData = null

    onMounted(async () => {
      try {
        const u = auth.currentUser
        if (!u) { err.value = 'You need to be logged in to view your profile.'; loading.value = false; return }
        user.value = u

        startLikesListener(u.uid)

        // Set up real-time listener for user data (including stats for badge)
        avatarLoaded.value = false
        unsubUserData = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) {
            const d = snap.data()
            username.value = d.username || ''
            firstName.value = d.firstName || ''
            lastName.value  = d.lastName || ''
            email.value     = d.email || u.email || ''
            phone.value     = d.phone || ''
            dateOfBirth.value = d.dateOfBirth || ''
            instagramId.value = d.instagram || ''
            telegramId.value = d.telegram || ''
            if (d.address) {
              const a = d.address
              // Check if address is a string or object
              if (typeof a === 'string') {
                // Address is already a string
                address.value = a
                addressObj.value = null
                console.log('[Profile] Loaded address as string:', address.value)
              } else {
                // Address is an object
                addressObj.value = a
                const parts = []
                if (a.blk) parts.push(a.blk)
                if (a.street) parts.push(a.street)
                if (a.unit) parts.push(a.unit)
                if (a.postal) parts.push(a.postal)
                address.value = parts.join(' ').trim()
                console.log('[Profile] Loaded address from object:', address.value, a)
              }
            } else {
              address.value = ''
              addressObj.value = null
            }
            // Only use Firestore photoURL - ignore Google profile picture
            avatarUrl.value = d.photoURL || d.profilePicture || ''
            // Delay to show loading animation
            setTimeout(() => {
              avatarLoaded.value = true
            }, 100)
            averageRating.value = d.averageRating || 0
            totalReviews.value = d.totalReviews || 0

            // Update user data with stats for badge calculation
            user.value = { ...user.value, stats: d.stats || { reviews: 0, boosts: 0 } }

            console.log('[Profile] Avatar URL loaded:', avatarUrl.value)
            console.log('[Profile] photoURL:', d.photoURL)
            console.log('[Profile] profilePicture:', d.profilePicture)
            console.log('[Profile] User rating data:', {
              averageRating: averageRating.value,
              totalReviews: totalReviews.value
            })
          } else {
            email.value = u.email || ''
            avatarUrl.value = ''
            avatarLoaded.value = true
          }
        })

        await loadMyListings()
      } catch (e) {
        console.error(e); err.value = 'Failed to load profile.'
      } finally {
        loading.value = false
      }
    })

    /* ---------------- Live My Listings (with batch reveal) ---------------- */
    async function loadMyListings() {
      if (!user.value) return
      if (unsubMyListings) { unsubMyListings(); unsubMyListings = null }
      myLoading.value = true

      const qRef = query(
        collection(db, 'users', user.value.uid, 'myListings'),
        orderBy('createdAt', 'desc')
      )

      unsubMyListings = onSnapshot(qRef, async (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const verified = []
        for (const r of rows) {
          const id = r.listingId
          if (!id) continue
          const mainSnap = await getDoc(doc(db, 'allListings', id))
          if (mainSnap.exists()) {
            const full = normalizePhotos({ id: mainSnap.id, ...mainSnap.data() })
            verified.push(full)
            fetchLikesCount(id)
          }
        }
        myListings.value = verified
        // Don't attach profile listeners for own listings - we use username/avatarUrl directly
        // prepare batch reveal AFTER list is set
        prepMyBatch(verified)
        myLoading.value = false
      }, () => { myLoading.value = false })
    }

    /* ---------------- Load Liked (with batch reveal) ---------------- */
    async function loadLikedListings() {
      if (!user.value || likedLoading.value) return
      try {
        likedLoading.value = true
        const likesSnap = await getDocs(collection(db, 'users', user.value.uid, 'likedListings'))
        const ids = likesSnap.docs.map(d => d.data()?.listingId).filter(Boolean)
        if (!ids.length) {
          likedListings.value = []
          prepLikedBatch([])
          likedLoaded.value = true
          return
        }

        const batches = chunk(ids, 10)
        // Parallelize batch queries for faster loading
        const batchPromises = batches.map(async (group) => {
          const qRef = query(collection(db, 'allListings'), where('listingId', 'in', group))
          const snap = await getDocs(qRef)
          return snap.docs.map(docSnap => normalizePhotos({ id: docSnap.id, ...docSnap.data() }))
        })
        const batchResults = await Promise.all(batchPromises)
        const resolved = batchResults.flat()
        // Fetch likes count for all listings
        resolved.forEach(data => {
          if (data.listingId) fetchLikesCount(data.listingId)
        })
        resolved.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        likedListings.value = resolved
        attachProfileListeners(resolved)
        prepLikedBatch(resolved)
        likedLoaded.value = true
      } finally { likedLoading.value = false }
    }

    /* ---------------- Booking Requests ---------------- */
    async function loadBookingRequests() {
      if (!user.value || bookingsLoading.value) return
      try {
        bookingsLoading.value = true
        const q = query(
          collection(db, 'bookingRequests'),
          where('sellerId', '==', user.value.uid),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)

        // Fetch buyer details for each booking
        const bookingsWithUserData = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const bookingData = { id: docSnap.id, ...docSnap.data() }

            // Fetch buyer's user data to get username
            if (bookingData.buyerId) {
              try {
                const buyerDoc = await getDoc(doc(db, 'users', bookingData.buyerId))
                if (buyerDoc.exists()) {
                  const buyerData = buyerDoc.data()
                  bookingData.buyerUsername = buyerData.username || bookingData.buyerName
                  bookingData.buyerPhone = buyerData.phone || bookingData.buyerPhone
                }
              } catch (err) {
                console.error('Error fetching buyer data:', err)
              }
            }

            return bookingData
          })
        )

        bookingRequests.value = bookingsWithUserData
        bookingsLoaded.value = true
      } catch (error) {
        console.error('Error loading booking requests:', error)
      } finally {
        bookingsLoading.value = false
      }
    }

    async function acceptBooking(bookingId) {
      try {
        await updateDoc(doc(db, 'bookingRequests', bookingId), {
          status: 'accepted',
          updatedAt: serverTimestamp()
        })

        // Update local state
        const booking = bookingRequests.value.find(b => b.id === bookingId)
        if (booking) booking.status = 'accepted'

        // Send chat message to buyer
        if (booking && booking.buyerId) {
          try {
            // Find or create chat between seller and buyer
            const chatsRef = collection(db, 'chats')
            const q = query(chatsRef, where('participants', 'array-contains', user.value.uid))
            const snap = await getDocs(q)

            let chatId = null
            snap.forEach(d => {
              const p = d.data()?.participants || []
              if (p.length === 2 && p.includes(booking.buyerId)) {
                chatId = d.id
              }
            })

            // Create new chat if doesn't exist
            if (!chatId) {
              const chatDoc = await addDoc(chatsRef, {
                participants: [user.value.uid, booking.buyerId],
                lastMessage: '',
                updatedAt: serverTimestamp()
              })
              chatId = chatDoc.id
            }

            // Send acceptance message
            const message = `Your booking request for "${booking.listingName}" on ${booking.date} at ${booking.time} has been accepted! I'll contact you soon to confirm the details.`

            await addDoc(collection(db, `chats/${chatId}/messages`), {
              senderId: user.value.uid,
              text: message,
              timestamp: serverTimestamp()
            })

            // Update chat's last message
            await updateDoc(doc(db, 'chats', chatId), {
              lastMessage: message,
              updatedAt: serverTimestamp()
            })
          } catch (chatError) {
            // Silently handle errors - console filter will suppress them
            // Don't fail the booking acceptance if chat fails
          }
        }

        toast.success('Booking accepted! A message has been sent to the buyer.')
      } catch (error) {
        console.error('Error accepting booking:', error)
        toast.error('Failed to accept booking. Please try again.')
      }
    }

    async function rejectBooking(bookingId) {
      try {
        await updateDoc(doc(db, 'bookingRequests', bookingId), {
          status: 'rejected',
          updatedAt: serverTimestamp()
        })
        // Update local state
        const booking = bookingRequests.value.find(b => b.id === bookingId)
        if (booking) booking.status = 'rejected'
        toast.success('Booking rejected.')
      } catch (error) {
        console.error('Error rejecting booking:', error)
        toast.error('Failed to reject booking. Please try again.')
      }
    }

    /* ---------------- Profile actions ---------------- */
    function onPickAvatar(e) {
      const f = e.target.files?.[0]
      if (!f || !/^image\//.test(f.type)) return
      avatarFile.value = f
      avatarUrl.value = URL.createObjectURL(f)
      avatarLoaded.value = true // Show the preview immediately
    }

    async function saveProfile() {
      err.value = ''; ok.value = ''
      const u = username.value.trim()
      const ph = normPhone(phone.value)
      if (!u) { err.value = 'Username is required.'; return }
      if (ph && !/^\+65\d{8}$/.test(ph)) { err.value = 'Phone must be +65 followed by 8 digits.'; return }

      saving.value = true
      try {
        let photoURL = avatarUrl.value
        if (avatarFile.value) {
          const path = `avatars/${user.value.uid}/${Date.now()}-${avatarFile.value.name}`
          const sref = storageRef(storage, path)
          await uploadBytes(sref, avatarFile.value, { contentType: avatarFile.value.type })
          photoURL = await getDownloadURL(sref)
          // Clear the file input and update with the permanent URL
          avatarFile.value = null
          avatarUrl.value = photoURL
        }
        await updateDoc(doc(db, 'users', user.value.uid), {
          username: u,
          firstName: firstName.value.trim(),
          lastName: lastName.value.trim(),
          phone: ph,
          dateOfBirth: (dateOfBirth.value || '').trim(),
          address: address.value.trim(),
          email: email.value || user.value.email || '',
          photoURL,
          profilePicture: photoURL, // Keep both fields in sync
          instagram: instagramId.value.trim(),
          telegram: telegramId.value.trim(),
          updatedAt: serverTimestamp()
        })
        ok.value = 'Profile saved!'
      } catch (e) {
        console.error(e); err.value = 'Failed to save. Please try again.'
      } finally { saving.value = false }
    }

    async function onToggleLike(listing) {
      const uid = auth.currentUser?.uid
      if (!uid) return toast.error('Please log in to like.')

      const id = listing.listingId || listing.id
      const userLikeRef = doc(db, 'users', uid, 'likedListings', id)
      const publicLikeRef = doc(db, 'listingLikes', id, 'users', uid)

      const isLiked = likedSet.value.has(id)
      const s = new Set(likedSet.value)
      if (isLiked) s.delete(id); else s.add(id)
      likedSet.value = s

      const prev = likeCounts.value[id] || 0
      likeCounts.value = { ...likeCounts.value, [id]: Math.max(0, prev + (isLiked ? -1 : +1)) }

      try {
        if (isLiked) {
          await Promise.all([deleteDoc(userLikeRef), deleteDoc(publicLikeRef)])
          // If we're on the liked tab and just unliked, refresh the list
          if (activeTab.value === 'liked') {
            likedLoaded.value = false
            await loadLikedListings()
          }
        } else {
          const payload = { at: new Date() }
          await Promise.all([
            setDoc(userLikeRef, { listingId: id, ...payload }),
            setDoc(publicLikeRef, payload)
          ])
        }
      } catch (e) {
        const r = new Set(likedSet.value)
        if (isLiked) r.add(id); else r.delete(id)
        likedSet.value = r
        likeCounts.value = { ...likeCounts.value, [id]: prev }
        console.error('like toggle error:', e)
        toast.error('Could not update like. Please try again.')
      }
    }

    /* ---------------- Drawer wiring (NEW) ---------------- */
    const drawerOpen = ref(false)
    const drawerListing = ref(null)

    const drawerSellerName = computed(() => {
      const uid = drawerListing.value?.userId
      return (uid && profileMap.value[uid]?.displayName) || ''
    })
    const drawerSellerAvatar = computed(() => {
      const uid = drawerListing.value?.userId
      return (uid && profileMap.value[uid]?.photoURL) || ''
    })

    function openDrawer(listing) {
      drawerListing.value = listing
      // profileMap already live-syncs seller; computed props above will flow in
      drawerOpen.value = true
    }
    function closeDrawer() {
      drawerOpen.value = false
      drawerListing.value = null
    }

    /* ---------------- QR Code Modal ---------------- */
    const qrModalOpen = ref(false)
    const qrListing = ref(null)
    const qrCodeUrl = ref('')
    const qrGenerating = ref(false)

    async function showQRCode(listing) {
      const listingId = listing.listingId || listing.id
      const reviewCode = listing.reviewCode

      if (!reviewCode) {
        toast.error('This listing does not have a review code. Please edit and re-save the listing.')
        return
      }

      qrListing.value = listing
      qrModalOpen.value = true
      qrGenerating.value = true

      try {
        const dataUrl = await generateQRCode(listingId, reviewCode)
        qrCodeUrl.value = dataUrl
      } catch (error) {
        console.error('Error generating QR code:', error)
        toast.error('Failed to generate QR code')
        qrModalOpen.value = false
      } finally {
        qrGenerating.value = false
      }
    }

    function closeQRModal() {
      qrModalOpen.value = false
      qrListing.value = null
      qrCodeUrl.value = ''
    }

    function downloadQR() {
      if (!qrCodeUrl.value || !qrListing.value) return
      const listingName = qrListing.value.businessName || 'listing'
      const filename = `${listingName.replace(/\s+/g, '-').toLowerCase()}-review-qr.png`
      downloadQRCode(qrCodeUrl.value, filename)
      toast.success('QR code downloaded!')
    }

    function printQR() {
      if (!qrCodeUrl.value) return

      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Review QR Code - ${qrListing.value?.businessName || 'Listing'}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                font-family: Arial, sans-serif;
              }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { font-size: 14px; color: #666; margin-bottom: 20px; }
              img { max-width: 400px; }
            </style>
          </head>
          <body>
            <h1>${qrListing.value?.businessName || 'Business Name'}</h1>
            <p>Scan this QR code to leave a review</p>
            <img src="${qrCodeUrl.value}" alt="Review QR Code" />
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }

    /* ---------------- Boost Countdown (INSIDE setup) ---------------- */
    function formatCountdown(timestamp) {
      let targetTime;

      // Firestore Timestamp
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        targetTime = timestamp.seconds * 1000;
      }
      // ISO string
      else if (typeof timestamp === 'string') {
        targetTime = Date.parse(timestamp);
      }
      // Number (ms)
      else {
        targetTime = Number(timestamp || 0);
      }

      if (!targetTime || Number.isNaN(targetTime)) return 'Expired';

      const diff = targetTime - Date.now();
      if (diff <= 0) return 'Expired';

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    // Auto refresh countdown every minute
    let countdownInterval = null
    onMounted(() => {
      countdownInterval = setInterval(() => {
        myListings.value = [...myListings.value]; // trigger re-render
      }, 60000);

      // Show success notification if redirected from Stripe
      const params = new URLSearchParams(window.location.search);
      if (params.get('boosted') === 'true') {
        toast.success('Your listing has been boosted! It will receive increased visibility.', 'Success!');
        if (window.location.hash === '#my') {
          activeTab.value = 'my';
        }
        params.delete('boosted');
        window.history.replaceState({}, '', `${window.location.pathname}`);
      }
    })

    onUnmounted(() => {
      if (unsubLikes) unsubLikes()
      if (unsubMyListings) unsubMyListings()
      if (unsubUserData) unsubUserData()
      profileUnsubs.forEach(unsub => unsub && unsub())
      profileUnsubs.clear()
      if (countdownInterval) clearInterval(countdownInterval)
    })

    /* ---------------- Edit Listing ---------------- */
    function startEditListing(listing) {
      // Navigate to create service page with listing ID for editing
      router.push({
        path: '/createService',
        query: { edit: listing.listingId || listing.id }
      })
    }

    /* ---------------- Delete Listing ---------------- */
    const deleting = ref(false)
    const showDeleteModal = ref(false)
    const listingToDelete = ref(null)

    function confirmDeleteListing(listing) {
      listingToDelete.value = listing
      showDeleteModal.value = true
    }

    function cancelDelete() {
      showDeleteModal.value = false
      listingToDelete.value = null
    }

    async function proceedDelete() {
      if (!listingToDelete.value) return

      const listing = listingToDelete.value
      const listingId = listing.listingId || listing.id

      showDeleteModal.value = false
      deleting.value = true
      try {
        const u = auth.currentUser
        if (!u) throw new Error('Not authenticated')

        // Delete from allListings
        await deleteDoc(doc(db, 'allListings', listingId))

        // Delete from user's myListings
        await deleteDoc(doc(db, 'users', u.uid, 'myListings', listingId))

        // Delete photos from storage
        if (listing.photoUrls && Array.isArray(listing.photoUrls)) {
          for (const photoUrl of listing.photoUrls) {
            try {
              const photoRef = storageRef(storage, photoUrl)
              await deleteObject(photoRef)
            } catch (photoErr) {
              console.warn('Failed to delete photo:', photoUrl, photoErr)
            }
          }
        }

        // Delete reviews subcollection
        try {
          const reviewsSnapshot = await getDocs(collection(db, 'allListings', listingId, 'reviews'))
          for (const reviewDoc of reviewsSnapshot.docs) {
            await deleteDoc(reviewDoc.ref)
          }
        } catch (reviewErr) {
          console.warn('Failed to delete reviews:', reviewErr)
        }

        // Delete from listingLikes collection
        try {
          const likesSnapshot = await getDocs(collection(db, 'listingLikes', listingId, 'users'))
          for (const likeDoc of likesSnapshot.docs) {
            await deleteDoc(likeDoc.ref)
          }
          await deleteDoc(doc(db, 'listingLikes', listingId))
        } catch (likeErr) {
          console.warn('Failed to delete likes:', likeErr)
        }

        // Refresh the listings
        await loadMyListings()
      } catch (error) {
        console.error('Error deleting listing:', error)
      } finally {
        deleting.value = false
        listingToDelete.value = null
      }
    }


    return {
      /* tabs */
      activeTab, openTab,
      /* profile */
      loading, saving, err, ok,
      avatarUrl, avatarLoaded, onPickAvatar,
      firstName, lastName, username, email, phone, dateOfBirth, address, displayName,
      averageRating, totalReviews,
      saveProfile,
      /* lists + likes + profiles */
      myListings, myLoading, likedListings, likedLoading,
      likedSet, likeCounts, onToggleLike,
      profileMap,
      /* bookings */
      bookingRequests, bookingsLoading, acceptBooking, rejectBooking,
      /* batch reveal bindings */
      revealedMy, revealedLiked,
      handleMyImageLoaded, handleLikedImageLoaded,
      drawerOpen, drawerListing, drawerSellerName, drawerSellerAvatar,
      openDrawer, closeDrawer,
      formatCountdown,
      /* edit & delete */
      startEditListing, confirmDeleteListing, deleting,
      showDeleteModal, listingToDelete, cancelDelete, proceedDelete,
      /* QR code modal */
      qrModalOpen, qrListing, qrCodeUrl, qrGenerating,
      showQRCode, closeQRModal, downloadQR, printQR,
      // Socials
      instagramId,
      telegramId,
    }
  }
}
</script>

<template>
  <div class="bg-page">
    <div class="container py-3" aria-hidden="true"></div>

    <div class="container pb-5">
      <div class="row justify-content-center">
        <div class="col-12 col-xxl-10">
          <!-- Tabs -->
          <ul class="nav nav-tabs rounded-3 overflow-hidden shadow-soft mb-4">
            <li class="nav-item">
              <button class="nav-link" :class="{ active: activeTab === 'profile' }"
                @click="openTab('profile')">Profile</button>
            </li>
            <li class="nav-item">
              <button class="nav-link" :class="{ active: activeTab === 'my' }" @click="openTab('my')">My
                Listings</button>
            </li>
            <li class="nav-item">
              <button class="nav-link" :class="{ active: activeTab === 'bookings' }"
                @click="openTab('bookings')">Booking
                Requests</button>
            </li>
            <li class="nav-item">
              <button class="nav-link" :class="{ active: activeTab === 'liked' }"
                @click="openTab('liked')">Liked</button>
            </li>
          </ul>

          <!-- PROFILE -->
          <div v-show="activeTab === 'profile'" class="shadow-soft rounded-4 p-4 p-md-5 bg-white border">
            <div class="d-flex flex-column flex-md-row align-items-md-center gap-3 mb-4">
              <!-- Avatar -->
              <div class="position-relative">
                <img :src="avatarUrl || 'https://ui-avatars.com/api/?name=H&background=ECE8FF&color=5A43C5&size=128'"
                  class="profile-avatar-img" :class="{ 'loaded': avatarLoaded }" alt="Avatar" />
                <label class="btn btn-sm btn-light border position-absolute bottom-0 end-0 px-2 py-1">
                  Change <input type="file" accept="image/*" class="d-none" @change="onPickAvatar" />
                </label>
              </div>

              <!-- User Info -->
              <div class="flex-grow-1">
                <!-- Name + socials -->
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <h3 class="m-0">{{ username || '—' }}</h3>

                  <!-- Socials beside name -->
                  <a v-if="instagramId" :href="`https://instagram.com/${instagramId}`" target="_blank" rel="noopener"
                    class="text-decoration-none" @click.stop>
                    <img src="/src/assets/instagram.png" alt="Instagram" style="width:22px;height:22px;" />
                  </a>

                  <a v-if="telegramId" :href="`https://t.me/${telegramId}`" target="_blank" rel="noopener"
                    class="text-decoration-none" @click.stop>
                    <img src="/src/assets/telegram.png" alt="Telegram" style="width:22px;height:22px;" />
                  </a>
                </div>

                <div class="text-muted">{{ email || '—' }}</div>

                <!-- Rating Display -->
                <div v-if="totalReviews > 0" class="d-flex align-items-center gap-2 mt-2">
                  <div class="stars-display">
                    <span v-for="i in 5" :key="i" class="star"
                      :class="{ filled: i <= Math.round(averageRating) }">★</span>
                  </div>
                  <span class="fw-semibold">{{ averageRating.toFixed(1) }}</span>
                  <span class="text-muted small">
                    ({{ totalReviews }} {{ totalReviews === 1 ? 'review' : 'reviews' }})
                  </span>
                </div>
                <div v-else class="text-muted small mt-2">No rating yet</div>
              </div>
            </div>

            <div v-if="err" class="alert alert-danger py-2">{{ err }}</div>
            <div v-if="ok" class="alert alert-success py-2">{{ ok }}</div>

            <div class="row g-4">
              <div class="col-md-6">
                <label class="form-label fw-semibold">Username</label>
                <input class="form-control" v-model="username" placeholder="aaron" />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">Email</label>
                <input class="form-control" v-model="email" disabled />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">First name</label>
                <input class="form-control" v-model="firstName" placeholder="John" />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">Last name</label>
                <input class="form-control" v-model="lastName" placeholder="Doe" />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">Phone Number</label>
                <input class="form-control" v-model="phone" placeholder="+6591234567" />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">Date of birth</label>
                <input type="date" class="form-control" v-model="dateOfBirth" />
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">Address</label>
                <input class="form-control" v-model="address" placeholder="BLK 555B Tampines Ave 11" />
              </div>
              <!-- Social Media -->
              <div class="col-md-6">
                <label class="form-label fw-semibold">Instagram</label>
                <div class="input-group social-input-group">
                  <span class="input-group-text social-prefix">@</span>
                  <input class="form-control" v-model="instagramId" placeholder="your_instagram_handle" />
                </div>
                <div class="form-text">Enter your Instagram username (no link, just the handle)</div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Telegram</label>
                <div class="input-group social-input-group">
                  <span class="input-group-text social-prefix">@</span>
                  <input class="form-control" v-model="telegramId" placeholder="your_telegram_handle" />
                </div>
                <div class="form-text">Enter your Telegram username (no link, just the handle)</div>
              </div>

            </div>
            <div class="d-flex justify-content-end mt-4">
              <button class="btn btn-primary" :disabled="saving" @click="saveProfile">
                <span v-if="!saving">Save changes</span>
                <span v-else class="spinner-border spinner-border-sm"></span>
              </button>
            </div>
          </div>


          <!-- MY LISTINGS -->
          <div v-show="activeTab === 'my'" class="shadow-soft rounded-4 p-4 p-md-5 bg-white border">
            <h4 class="mb-4">My Listings</h4>

            <!-- Loading -->
            <div v-if="myLoading" class="text-center py-4">
              <div class="spinner-border"></div>
            </div>

            <!-- Empty -->
            <div v-else-if="!myListings.length" class="text-muted">
              You haven’t posted any listings yet.
            </div>

            <!-- Grid -->
            <div v-else class="row g-3 g-md-4">
              <div v-for="l in myListings" :key="l.listingId || l.id"
                class="col-12 col-sm-6 col-lg-4 d-flex flex-column">
                <ListingCard class="w-100 flex-grow-1" :listing="l" :liked="likedSet?.has(l.listingId || l.id)"
                  :likesCount="likeCounts[l.listingId || l.id] || 0"
                  :sellerNameOverride="username"
                  :sellerAvatarOverride="avatarUrl"
                  :showAll="true"
                  :reveal="revealedMy.has(l.listingId || l.id)" @toggle-like="onToggleLike"
                  @image-loaded="handleMyImageLoaded" @open="openDrawer(l)" />

                <!-- Boost section inside the same container/column -->
                <div class="mt-2">
                  <!-- Boost Timer (only if boostedUntil exists) -->
                  <div v-if="l.boostedUntil" class="boost-badge mb-2 ">
                    ⏰ Boost ends in: <strong>{{ formatCountdown(l.boostedUntil) }}</strong>
                  </div>

                  <!-- Action Buttons -->
                  <div class="d-flex gap-2 boost-section">
                    <router-link class="btn btn-sm btn-primary"
                      :to="{ path: '/boosting', query: { listingId: l.listingId || l.id } }" style="flex: 1;">
                      Boost
                    </router-link>
                    <button class="btn btn-sm btn-primary" @click="startEditListing(l)" style="flex: 1;">
                      Edit
                    </button>
                    <button class="btn btn-sm btn-success" @click="showQRCode(l)" style="flex: 1;">
                      QR Code
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="confirmDeleteListing(l)">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BOOKING REQUESTS -->
          <div v-show="activeTab === 'bookings'" class="shadow-soft rounded-4 p-4 p-md-5 bg-white border">
            <h4 class="mb-4">Booking Requests</h4>
            <div v-if="bookingsLoading" class="text-center py-4">
              <div class="spinner-border"></div>
            </div>
            <div v-else-if="!bookingRequests.length" class="text-muted">No booking requests yet.</div>
            <div v-else>
              <div v-for="booking in bookingRequests" :key="booking.id" class="booking-request-card card mb-3">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 class="mb-1">{{ booking.listingName }}</h6>
                      <p class="text-muted small mb-0">Request from: {{ booking.buyerUsername || booking.buyerName }}</p>
                    </div>
                    <span class="badge" :class="{
                      'bg-warning': booking.status === 'pending',
                      'bg-success': booking.status === 'accepted',
                      'bg-danger': booking.status === 'rejected'
                    }">{{ booking.status.toUpperCase() }}</span>
                  </div>

                  <div class="mb-2">
                    <strong>Date:</strong> {{ booking.date }}<br>
                    <strong>Time:</strong> {{ booking.time }}<br>
                    <strong>Email:</strong> {{ booking.buyerEmail }}<br>
                    <strong>Phone:</strong> {{ booking.buyerPhone || 'Not provided' }}
                  </div>

                  <div v-if="booking.message" class="mb-3">
                    <strong>Message:</strong>
                    <p class="mb-0 mt-1">{{ booking.message }}</p>
                  </div>

                  <div v-if="booking.status === 'pending'" class="d-flex gap-2">
                    <button class="btn btn-success btn-sm" @click="acceptBooking(booking.id)">
                      <i class="fas fa-check me-1"></i>Accept
                    </button>
                    <button class="btn btn-danger btn-sm" @click="rejectBooking(booking.id)">
                      <i class="fas fa-times me-1"></i>Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- LIKED -->
          <div v-show="activeTab === 'liked'" class="shadow-soft rounded-4 p-4 p-md-5 bg-white border">
            <h4 class="mb-4">Liked Listings</h4>
            <div v-if="likedLoading" class="text-center py-4">
              <div class="spinner-border"></div>
            </div>
            <div v-else-if="!likedListings.length" class="text-muted">No liked listings yet.</div>
            <div v-else class="row g-3 g-md-4">
              <div v-for="l in likedListings" :key="l.listingId || l.id"
                class="col-12 col-sm-6 col-lg-4 d-flex flex-column">
                <ListingCard class="w-100 flex-grow-1" :listing="l" :liked="likedSet?.has(l.listingId || l.id)"
                  :likesCount="likeCounts[l.listingId || l.id] || 0"
                  :sellerNameOverride="profileMap[l.userId]?.displayName || ''"
                  :sellerAvatarOverride="profileMap[l.userId]?.photoURL || ''"
                  :reveal="revealedLiked.has(l.listingId || l.id)" @toggle-like="onToggleLike"
                  @image-loaded="handleLikedImageLoaded" @open="openDrawer(l)" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- LISTING DRAWER (REUSED) -->
    <ListingDrawer :open="drawerOpen" :listing="drawerListing" :sellerName="drawerSellerName"
      :sellerAvatar="drawerSellerAvatar" @close="closeDrawer" />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-backdrop" @click="cancelDelete">
      <div class="modal-dialog" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm Delete</h5>
            <button type="button" class="btn-close-custom" @click="cancelDelete">×</button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete "<strong>{{ listingToDelete?.businessName }}</strong>"?</p>
            <p class="text-danger mb-0">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="cancelDelete">Cancel</button>
            <button type="button" class="btn btn-danger" @click="proceedDelete">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- QR Code Modal -->
    <Teleport to="body">
      <div v-if="qrModalOpen" class="qr-modal-backdrop" @click="closeQRModal">
        <div class="qr-modal" @click.stop>
          <div class="qr-modal-header">
            <h5 class="qr-modal-title">Review QR Code</h5>
            <button type="button" class="btn-close-custom" @click="closeQRModal">×</button>
          </div>
          <div class="qr-modal-body">
            <div v-if="qrGenerating" class="text-center py-4">
              <div class="spinner-border text-primary"></div>
              <p class="mt-2">Generating QR code...</p>
            </div>
            <div v-else class="text-center">
              <h6 class="mb-3">{{ qrListing?.businessName }}</h6>
              <p class="text-muted small mb-3">
                Customers can scan this QR code to unlock the ability to leave a review for your listing.
              </p>
              <div class="qr-code-container mb-3">
                <img :src="qrCodeUrl" alt="Review QR Code" class="qr-code-image" />
              </div>
              <div class="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-primary" @click="downloadQR">
                  <Icon icon="mdi:download" class="me-1" />
                  Download
                </button>
                <button type="button" class="btn btn-secondary" @click="printQR">
                  <Icon icon="mdi:printer" class="me-1" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bg-page {
  background: var(--color-bg-main);
}

.shadow-soft {
  box-shadow: 0 8px 28px rgba(0, 0, 0, .06);
}

.object-fit-cover {
  object-fit: cover;
}

.nav-tabs {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
}

.nav-tabs .nav-link {
  border: none;
  padding: .75rem 1rem;
  color: var(--color-text-primary);
  transition: all 0.2s ease;
}

.nav-tabs .nav-link.active {
  background: var(--color-bg-white);
  border-bottom: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.bg-white {
  background: var(--color-bg-white) !important;
  color: var(--color-text-primary);
}

.border {
  border-color: var(--color-border) !important;
}

.text-muted {
  color: var(--color-text-secondary) !important;
}

.form-label {
  color: var(--color-primary);
  font-weight: 600;
}

.form-control,
input[type="date"] {
  background: var(--color-bg-white);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.form-control:disabled {
  background: var(--color-bg-purple-tint);
  color: var(--color-text-secondary);
}

.form-control::placeholder {
  color: var(--color-text-secondary);
}

.form-control:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 .2rem rgba(122, 90, 248, 0.15);
  background: var(--color-bg-white);
  color: var(--color-text-primary);
}

h3,
h4 {
  color: var(--color-text-primary);
}

.alert {
  background: var(--color-bg-white);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-light {
  background: var(--color-bg-white);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.btn-light:hover {
  background: var(--color-bg-purple-tint);
  border-color: var(--color-border);
}

/* Star Rating Display */
.stars-display {
  display: inline-flex;
  gap: 2px;
}

.stars-display .star {
  color: #ddd;
  font-size: 18px;
  transition: color 0.2s ease;
}

.stars-display .star.filled {
  color: #ffc107;
}

.boost-badge {
  background: var(--color-bg-purple-tint);
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 8px;
  display: inline-block;
}

.boost-section .btn {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.boost-section .btn:hover {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

/* Fix Edit button visibility in both light and dark mode */
.boost-section .btn-outline-primary {
  color: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
  background-color: transparent !important;
}

.boost-section .btn-outline-primary:hover {
  background-color: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
  color: white !important;
}

.boost-section .btn-outline-danger {
  color: #dc3545 !important;
  border-color: #dc3545 !important;
  background-color: transparent !important;
}

.boost-section .btn-outline-danger:hover {
  background-color: #dc3545 !important;
  border-color: #dc3545 !important;
  color: white !important;
}

/* Delete Modal Styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-dialog {
  max-width: 500px;
  width: 90%;
}

.modal-content {
  background: var(--color-bg-white);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  color: var(--color-text-primary);
}

.modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.btn-close-custom {
  background: transparent;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: var(--color-text-primary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-custom:hover {
  opacity: 0.7;
}

.modal-body {
  padding: 1.5rem 1.25rem;
}

.modal-body p {
  color: var(--color-text-primary);
  margin-bottom: 0.75rem;
}

.modal-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Mobile responsive styles */
@media (max-width: 767.98px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .card {
    padding: 1.25rem;
  }

  .nav-tabs .nav-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  h2,
  h3 {
    font-size: 1.5rem;
  }

  .btn {
    font-size: 0.875rem;
  }

  .boost-section .btn {
    height: 44px;
    font-size: 0.875rem;
  }
}

@media (max-width: 575.98px) {
  .card {
    padding: 1rem;
  }

  h2,
  h3 {
    font-size: 1.25rem;
  }

  .form-control,
  .form-select {
    font-size: 0.875rem;
  }

  .stars-display .star {
    font-size: 16px;
  }
}

/* QR Code Modal Styles */
.qr-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.qr-modal {
  background: var(--color-bg-white);
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.qr-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.qr-modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.qr-modal-body {
  padding: 24px;
}

.qr-code-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: inline-block;
}

.qr-code-image {
  max-width: 300px;
  width: 100%;
  height: auto;
  display: block;
}

@media (max-width: 575.98px) {
  .qr-modal {
    max-width: 100%;
  }

  .qr-code-image {
    max-width: 250px;
  }
}

/* Profile Avatar Fade-In Effect */
.profile-avatar-img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}

.profile-avatar-img.loaded {
  opacity: 1;
}

/* Social Media Input Groups Dark Mode */
.social-input-group .input-group-text.social-prefix {
  background: var(--color-bg-white);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

:root.dark-mode .social-input-group .input-group-text.social-prefix {
  background: var(--color-bg-main);
  border-color: var(--color-border);
  color: var(--color-text-white);
}

/* Booking Request Card Styles */
.booking-request-card {
  background: var(--color-bg-white);
  border-color: var(--color-border);
  transition: box-shadow 0.2s ease;
}

.booking-request-card .card-body {
  background: var(--color-bg-white);
}

.booking-request-card h6 {
  color: var(--color-text-primary);
}

.booking-request-card strong {
  color: var(--color-text-primary);
}

.booking-request-card p {
  color: var(--color-text-primary);
}

.booking-request-card:hover {
  box-shadow: var(--shadow-sm);
}

/* Dark mode for booking request cards */
:root.dark-mode .booking-request-card {
  background: var(--color-bg-white);
  border-color: var(--color-border);
}

:root.dark-mode .booking-request-card .card-body {
  background: var(--color-bg-white);
}

:root.dark-mode .booking-request-card h6,
:root.dark-mode .booking-request-card strong,
:root.dark-mode .booking-request-card p {
  color: var(--color-text-primary) !important;
}
</style>
