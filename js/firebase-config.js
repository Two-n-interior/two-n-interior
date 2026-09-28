/* Firebase project config for Two n Interior — safe to expose client-side; access is controlled by Firestore security rules, not by hiding this key. */
const firebaseConfig = {
  apiKey: 'AIzaSyC7APHLWBnTVh6IFZKL7T-i272nuWKZk2M',
  authDomain: 'two-n-interior-95ad6.firebaseapp.com',
  projectId: 'two-n-interior-95ad6',
  storageBucket: 'two-n-interior-95ad6.firebasestorage.app',
  messagingSenderId: '51568119544',
  appId: '1:51568119544:web:99c21a19935b58e8e9b50d',
  measurementId: 'G-3MSPSCBWV0'
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

/* Cloudinary unsigned upload — used by admin.html to host new portfolio photos without a server. */
const CLOUDINARY_CLOUD_NAME = 'ppwoltfx';
const CLOUDINARY_UPLOAD_PRESET = 'two_n_interior';

const CATEGORY_LABELS = {
  th: {
    construction: 'งานก่อสร้าง/ต่อเติม',
    interior: 'ตกแต่งภายใน',
    furniture: 'เฟอร์นิเจอร์ Built-in',
    garden: 'จัดสวน'
  },
  en: {
    construction: 'Construction/Renovation',
    interior: 'Interior Design',
    furniture: 'Built-in Furniture',
    garden: 'Landscaping'
  }
};
