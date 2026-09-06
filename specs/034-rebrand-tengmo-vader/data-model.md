# Data Model: Rebrand to Tengmo Väder

No new or changed data entities, types, or persisted state. This feature only changes static
string literals (page title, footer text, PWA manifest `name`/`short_name`, a user-agent string),
a static config value (`public/CNAME`'s domain), and committed binary assets (`public/*.png` icon
files regenerated from a different source image). No component prop shapes, hooks, or storage
schemas change.
