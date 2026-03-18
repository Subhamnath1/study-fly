import { useEffect, useRef, useState } from 'react';
import { useSchedule } from '@hooks/useSchedule';
import { NotificationService } from '@services/notifications';

function parseTimeString(timeStr) {
    // "08:00 AM" -> Date object for today at 08:00
    if (!timeStr) return null;

    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;

    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
}

/**
 * Hook to automatically schedule push notifications for today's classes and exams.
 */
export function useNotifications() {
    const { current } = useSchedule();
    const [permission, setPermission] = useState(NotificationService.getPermissionStatus());
    const timeoutsRef = useRef([]);

    const requestPermission = async () => {
        const granted = await NotificationService.requestPermission();
        setPermission(granted ? 'granted' : 'denied');
        return granted;
    };

    // Clear all pending timeouts
    const clearScheduled = () => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
    };

    useEffect(() => {
        // Only schedule if we have permission and schedule data
        if (permission !== 'granted' || !current || !current.subjects) return;

        clearScheduled();

        const now = Date.now();
        const PRE_WARNING_MS = 5 * 60 * 1000; // Notify 5 minutes before unlockTime

        current.subjects.forEach(subj => {
            if (!subj.unlockTime) return;

            const targetTime = parseTimeString(subj.unlockTime);
            if (!targetTime) return;

            // Time until the exact class start
            const msUntilLive = targetTime - now;

            // Schedule the exactly On-Time Notification
            if (msUntilLive > 0) {
                const id = setTimeout(() => {
                    const typeStr = current.dayType === 'CHAPTER_EXAM' ? 'Exam' : 'Class';
                    NotificationService.showLocalNotification(`${subj.subject} ${typeStr} is LIVE!`, {
                        body: `Your scheduled ${typeStr.toLowerCase()} "${subj.topic}" has unlocked. Click to start learning.`,
                        tag: `live-${subj.subject}-${current.date}` // Prevents overlapping dupes
                    });
                }, msUntilLive);

                timeoutsRef.current.push(id);
            }

            // Schedule the 5-Minute Warning Notification
            const msUntilWarning = msUntilLive - PRE_WARNING_MS;
            if (msUntilWarning > 0) {
                const wid = setTimeout(() => {
                    NotificationService.showLocalNotification(`Upcoming: ${subj.subject}`, {
                        body: `${subj.topic} unlocks in 5 minutes! Get ready.`,
                        tag: `warn-${subj.subject}-${current.date}`
                    });
                }, msUntilWarning);

                timeoutsRef.current.push(wid);
            }
        });

        return clearScheduled;
    }, [current, permission]);

    return {
        permissionStatus: permission,
        requestPermission
    };
}
