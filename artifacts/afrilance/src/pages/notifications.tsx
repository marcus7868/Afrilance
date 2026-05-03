import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useListNotifications({}, {
    query: { queryKey: getListNotificationsQueryKey({}) },
  });

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllNotificationsRead();

  const handleMarkRead = (id: number) => {
    markRead(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) });
        },
      },
    );
  };

  const handleMarkAll = () => {
    markAllRead(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) });
      },
    });
  };

  const notifIcons: Record<string, React.ReactNode> = {
    new_proposal: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    proposal_status: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {data?.unreadCount != null && data.unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">{data.unreadCount} unread</p>
          )}
        </div>
        {data?.unreadCount != null && data.unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !data?.notifications.length ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-muted-foreground font-medium">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-4 p-4 bg-card border rounded-xl transition-colors",
                n.isRead ? "border-border" : "border-primary/30 bg-primary/5",
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                n.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
              )}>
                {notifIcons[n.type] ?? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{n.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatRelative(n.createdAt)}</div>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-primary hover:underline flex-shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
