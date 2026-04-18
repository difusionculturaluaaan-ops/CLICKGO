import admin from 'firebase-admin'

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) return JSON.parse(raw)
  return {
    type: 'service_account',
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
    token_uri: 'https://oauth2.googleapis.com/token',
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  })
}

export const adminAuth = admin.auth()
export const adminDb = admin.database()
export const adminMessaging = admin.messaging()
export default admin
