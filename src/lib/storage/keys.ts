export const STORAGE = {
  ACTIVE_CHILD_ID: 'shai_active_child_id',
  CHILD_NAME: 'shai_child_name',
  AVATAR_URL: 'shai_avatar_url',
  dailyFeedback: (date: string) => `shai_daily_feedback_${date}`,
  weeklySummary: (monday: string) => `shai_weekly_summary_${monday}`,
  feedAlarm: (childId: string) => `shai_feed_alarm_${childId}`,
  feedReminderMins: (childId: string) => `shai_feed_reminder_mins_${childId}`,
  dismissedFavourites: (meal: string) => `shai_dismissed_favourites_${meal}`,
} as const;
