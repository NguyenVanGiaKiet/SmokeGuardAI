import * as Notifications from 'expo-notifications';

export async function scheduleDailyReminder() {
  // Yêu cầu quyền
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  // Hủy thông báo cũ để tránh trùng lặp
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Lên lịch thông báo mới vào 8:00 sáng hàng ngày
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Nhắc nhở từ SmokeGuardAI",
      body: "Một ngày mới, một hơi thở trong lành! Hãy tiếp tục cố gắng nhé!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}
