import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { NotificationItem } from '../types';

const badgeClass: Record<string, string> = {
  purple: 'study-badge-purple',
  green: 'study-badge-green',
  amber: 'study-badge-amber',
  red: 'study-badge-red',
  info: 'study-badge-blue',
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const { data } = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>(
      '/notifications'
    );
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await api.patch('/notifications/all/read');
    load();
  };

  return (
    <>
      <div
        className="study-page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <div className="study-greeting">Notifications</div>
          <div className="study-sub">
            {unread} unread · reminders from your schedule
          </div>
        </div>
        <button type="button" className="study-btn study-btn-outline study-btn-sm" onClick={markAll}>
          Mark all read
        </button>
      </div>

      <div className="study-grid2">
        <div>
          <div className="study-section-hdr">
            <div className="study-section-ttl">Reminders</div>
            {unread > 0 && <span className="study-badge study-badge-red">{unread} new</span>}
          </div>
          {items.length === 0 && (
            <div className="study-card">
              <p className="study-sub" style={{ marginBottom: 12 }}>
                No notifications yet. The scheduler creates reminders before sessions when tasks are due.
              </p>
              <button
                type="button"
                className="study-btn study-btn-outline study-btn-sm"
                onClick={async () => {
                  await api.post('/notifications/demo');
                  load();
                }}
              >
                Load sample reminders
              </button>
            </div>
          )}
          {items.map((n) => (
            <div
              key={n._id}
              className="study-notif-card"
              style={{ opacity: n.read ? 0.55 : 1 }}
            >
              <div className="study-notif-dot" style={{ background: '#818cf8' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 2 }}>{n.title}</div>
                {n.body && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{n.body}</div>
                )}
              </div>
              <span
                className={`study-badge ${badgeClass[n.badge || 'info'] || 'study-badge-blue'}`}
                style={{ marginLeft: 'auto', flexShrink: 0 }}
              >
                {n.read ? 'Read' : 'New'}
              </span>
            </div>
          ))}
        </div>

        <div>
          <div className="study-section-hdr">
            <div className="study-section-ttl">Upcoming Tasks</div>
          </div>
          <p className="study-sub" style={{ marginBottom: 12 }}>
            Open the Dashboard to mark today&apos;s blocks complete and keep your streak.
          </p>
        </div>
      </div>
    </>
  );
}
