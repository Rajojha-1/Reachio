# Firebase Security Rules for Reachio

Copy and paste these rules into your Firebase Console:
**Realtime Database → Rules tab**

```json
{
  "rules": {
    "sessions": {
      "$session_id": {
        ".read": "true",
        ".write": "data.val() == null || data.child('active').val() == true",
        ".validate": "newData.hasChildren(['createdAt', 'expiresAt', 'sender', 'active'])",

        "sender": {
          ".validate": "newData.hasChildren(['lat', 'lng', 'timestamp'])",
          "lat": { ".validate": "newData.isNumber() && newData.val() >= -90 && newData.val() <= 90" },
          "lng": { ".validate": "newData.isNumber() && newData.val() >= -180 && newData.val() <= 180" },
          "timestamp": { ".validate": "newData.isNumber()" },
          "speed": { ".validate": "newData.isNumber() && newData.val() >= 0" },
          "lastMovedAt": { ".validate": "newData.isNumber()" }
        },

        "destination": {
          ".validate": "newData.hasChildren(['lat', 'lng', 'timestamp'])",
          "lat": { ".validate": "newData.isNumber() && newData.val() >= -90 && newData.val() <= 90" },
          "lng": { ".validate": "newData.isNumber() && newData.val() >= -180 && newData.val() <= 180" },
          "timestamp": { ".validate": "newData.isNumber()" }
        },

        "active": { ".validate": "newData.isBoolean()" },
        "createdAt": { ".validate": "newData.isNumber()" },
        "expiresAt": { ".validate": "newData.isNumber()" },
        "status": { ".validate": "newData.isString()" },
        "eta": { ".validate": "newData.isNumber() || newData.val() == null" }
      }
    }
  }
}
```

## What these rules do:

| Rule | Purpose |
|------|---------|
| `.read: true` | Anyone with the session ID can view/track it |
| `.write` check | Only allows writes to new sessions or active sessions. Once `active` is `false`, the session is locked. |
| `.validate` on root | Requires `createdAt`, `expiresAt`, `sender`, and `active` fields |
| Coordinate validation | Ensures lat/lng are valid numbers within geographic bounds |
| Type validation | Prevents injection of unexpected data types |

## Important notes:
- These rules do NOT prevent deletion of sessions — the client-side cleanup function needs this permission.
- Sessions with `active: false` cannot be modified (prevents tampering with ended sessions).
- The `expiresAt` field enables client-side TTL enforcement; Firebase itself doesn't auto-delete, but clients clean up expired sessions opportunistically.
