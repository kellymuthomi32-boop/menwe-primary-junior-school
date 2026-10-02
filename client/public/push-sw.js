self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "" }; }
  const title = payload.title || "Menwe Primary & Junior School";
  const options = {
    body: payload.body || "You have a new school notification.",
    icon: payload.icon || "/favicon.svg?v=5",
    badge: payload.badge || "/favicon.svg?v=5",
    data: { url: payload.url || "/portal/teacher" },
    tag: payload.tag || "menwe-school-notification",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || "/portal/teacher";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) void client.navigate(new URL(target, self.location.origin).href);
          return client.focus();
        }
      }
      return clients.openWindow(new URL(target, self.location.origin).href);
    })
  );
});
