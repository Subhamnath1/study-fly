/**
 * @fileoverview Browser Notifications API Service.
 * Handles permission requests and local notification triggering.
 */

export const NotificationService = {
    /**
     * Check current notification permission status.
     * @returns {'granted' | 'denied' | 'default'}
     */
    getPermissionStatus() {
        if (!('Notification' in window)) return 'denied';
        return Notification.permission;
    },

    /**
     * Request notification permission from the user natively.
     * @returns {Promise<boolean>} True if granted.
     */
    async requestPermission() {
        if (!('Notification' in window)) return false;

        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        return permission === 'granted';
    },

    /**
     * Display an immediate local notification.
     * @param {string} title 
     * @param {NotificationOptions} options 
     */
    showLocalNotification(title, options = {}) {
        if (this.getPermissionStatus() === 'granted') {
            new Notification(title, {
                icon: '/vite.svg', // Will show the app icon
                badge: '/vite.svg',
                requireInteraction: true,
                ...options
            });
        }
    }
};
