# Data Model: "How This Works" Documentation Page

No new or changed data entities, types, or persisted state. The panel's only state is a local
`useState<boolean>` in `Footer.tsx` (open/closed), the same shape `privacyOpen` already has —
never persisted, never affecting any other component's props or the app's selected
location/view.
