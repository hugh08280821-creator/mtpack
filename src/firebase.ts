import { initializeApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
import { firebaseConfig } from './firebaseConfig'

export const db: Database | null = firebaseConfig ? getDatabase(initializeApp(firebaseConfig)) : null
