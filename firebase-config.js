const firebaseConfig = {
  apiKey: "AIzaSyAbBRAoOaDJSt85KdkbDJBRVaoG12LJKak",
  authDomain: "ontrole-baba-jogadores-1a16a.firebaseapp.com",
  projectId: "ontrole-baba-jogadores-1a16a",
  storageBucket: "ontrole-baba-jogadores-1a16a.firebasestorage.app",
  messagingSenderId: "747543133928",
  appId: "1:747543133928:web:7095f1b6fa72c5bc75935d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();