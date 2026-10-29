import { getNotifications, removeScheduleNotifications } from "../notifications";

describe("schedule reminder notifications", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "token",
      `header.${btoa(JSON.stringify({ id: "user-1" }))}.signature`
    );
  });

  it("removes a matching reminder when the log is within 15 minutes", () => {
    const scheduledAt = "2026-10-29T18:00:00.000Z";
    localStorage.setItem("notifications:user-1", JSON.stringify([
      {
        id: "scheduled-feeding",
        notificationType: "schedule-reminder",
        childId: "child-1",
        activityType: "feeding",
        occursAt: scheduledAt,
      },
    ]));

    removeScheduleNotifications("child-1", "feeding", new Date("2026-10-29T18:15:00.000Z"));

    expect(getNotifications()).toEqual([]);
  });

  it("keeps reminders outside the window or for a different child or activity", () => {
    const scheduledAt = "2026-10-29T18:00:00.000Z";
    const reminders = [
      {
        id: "outside-window",
        notificationType: "schedule-reminder",
        childId: "child-1",
        activityType: "feeding",
        occursAt: scheduledAt,
      },
      {
        id: "other-child",
        notificationType: "schedule-reminder",
        childId: "child-2",
        activityType: "feeding",
        occursAt: scheduledAt,
      },
      {
        id: "other-activity",
        notificationType: "schedule-reminder",
        childId: "child-1",
        activityType: "sleep",
        occursAt: scheduledAt,
      },
    ];
    localStorage.setItem("notifications:user-1", JSON.stringify(reminders));

    removeScheduleNotifications("child-1", "feeding", new Date("2026-10-29T18:15:01.000Z"));

    expect(getNotifications()).toEqual(reminders);
  });
});
