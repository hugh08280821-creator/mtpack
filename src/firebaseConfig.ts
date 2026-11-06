import type { FirebaseOptions } from 'firebase/app'

// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 복사한 값.
// 웹용 설정값은 공개되어도 되는 값이고, 실제 접근 권한은 Realtime Database 규칙이 정한다.
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyAZljtJ_ZehBSIgaxtK0sd6iSHEnvszFXg',
  authDomain: 'simdo-eeffe.firebaseapp.com',
  databaseURL: 'https://simdo-eeffe-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'simdo-eeffe',
  storageBucket: 'simdo-eeffe.firebasestorage.app',
  messagingSenderId: '970162197724',
  appId: '1:970162197724:web:c304113a615fb295bbd019',
}
