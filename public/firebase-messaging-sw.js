// Retrieve Firebase Messaging object.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Since the Service Worker doesn't have access to vite env vars directly,
// we pull them from the URL query params during registration, or fallback.
// However, the standard Firebase approach is just hardcoding the public static config here:

firebase.initializeApp({
    apiKey: "AIzaSyAwCAwTUt13bzjTQ2uliqXwFzXhm6fbq4A",
    authDomain: "study-fly.firebaseapp.com",
    projectId: "study-fly",
    storageBucket: "study-fly.firebasestorage.app",
    messagingSenderId: "591506798197",
    appId: "1:591506798197:web:1a8fb012433a066f612a3c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/vite.svg',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
