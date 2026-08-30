export const STORAGE = {
  ACTIVE_CHILD_ID: 'shai_active_child_id',
  CHILD_NAME: 'shai_child_name',
  AVATAR_URL: 'shai_avatar_url',
  dailyFeedback: (date: string) => `shai_daily_feedback_${date}`,
  weeklySummary: (monday: string) => `shai_weekly_summary_${monday}`,
  dismissedFavourites: (meal: string) => `shai_dismissed_favourites_${meal}`,
  pinnedFavourites: (meal: string) => `shai_pinned_favs_${meal}`,
  FEED_DISMISSED_AT: 'shai_feed_dismissed_at',
  LOG_DATE: 'shai_log_date',
} as const;
