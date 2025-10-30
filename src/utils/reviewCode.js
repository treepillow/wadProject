import QRCode from 'qrcode'

/**
 * Generate a unique review code for a listing
 * Format: REVIEW-{random-alphanumeric}
 */
export function generateReviewCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'REVIEW-'

  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return code
}

/**
 * Generate QR code as data URL
 * @param {string} listingId - The listing ID
 * @param {string} reviewCode - The review code
 * @returns {Promise<string>} - Data URL of QR code image
 */
export async function generateQRCode(listingId, reviewCode) {
  try {
    // For now, we'll use window.location.origin in components
    // This utility just handles the QR generation
    const url = `${window.location.origin}/review/${listingId}?code=${reviewCode}`

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    return qrDataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

/**
 * Download QR code as PNG file
 * @param {string} dataUrl - The QR code data URL
 * @param {string} filename - The filename for download
 */
export function downloadQRCode(dataUrl, filename = 'review-qr-code.png') {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Verify if a review code is valid and not used by this user
 * @param {string} code - The review code to verify
 * @param {string} listingId - The listing ID
 * @param {string} userId - The user ID
 * @param {object} db - Firestore database instance
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export async function verifyReviewCode(code, listingId, userId, db) {
  try {
    const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore')

    // Check if listing exists and code matches
    const listingRef = doc(db, 'allListings', listingId)
    const listingDoc = await getDoc(listingRef)

    if (!listingDoc.exists()) {
      return { valid: false, message: 'Listing not found.' }
    }

    const listingData = listingDoc.data()

    if (!listingData.reviewCode || listingData.reviewCode !== code) {
      return { valid: false, message: 'Invalid review code.' }
    }

    // Check if user has already used this code
    const usedCodesQuery = query(
      collection(db, 'usedReviewCodes'),
      where('userId', '==', userId),
      where('listingId', '==', listingId)
    )

    const usedCodesSnapshot = await getDocs(usedCodesQuery)

    if (!usedCodesSnapshot.empty) {
      return { valid: false, message: 'You have already used this review code for this listing.' }
    }

    return { valid: true, message: 'Review code verified successfully!' }
  } catch (error) {
    console.error('Error verifying review code:', error)
    return { valid: false, message: 'Error verifying code. Please try again.' }
  }
}

/**
 * Mark a review code as used by a user
 * @param {string} listingId - The listing ID
 * @param {string} userId - The user ID
 * @param {object} db - Firestore database instance
 */
export async function markReviewCodeAsUsed(listingId, userId, db) {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')

    await addDoc(collection(db, 'usedReviewCodes'), {
      listingId,
      userId,
      usedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error marking review code as used:', error)
    throw error
  }
}
