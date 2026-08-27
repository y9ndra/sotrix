# 🎨 Sotrix UI Design Specifications & Flow Ideas
*Sotrix: The Layered Deck Dashboard*

Sotrix is built on the concept of **"Spaces, not Pages."** Rather than standard routes that load empty pages or overlay heavy popup modals, the user experience is structured like a **layered deck of horizontal sheets** that stack and slide in from the right edge of the screen.

This document serves as the master specification for the global architecture, visual theme, and individual page layouts.

---

## 🖤 Part 1: The Core Theme (Monochromatic Obsidian)

* **The Canvas**: Pure Pitch Black (`#000000`).
* **The Sheets / Panels**: Dark Charcoal (`#0a0a0a` or `#121212`) cards separated by sharp 1px Slate borders (`#1e1e1e`).
* **Text Hierarchy**: High-contrast Silver (`#f4f4f5`) for titles/inputs, and Muted Platinum (`#a1a1aa`) for body contents.
* **The Accent Rule**: Flat Emerald Green (`#10b981`) is used **strictly for static status states** (e.g. active online nodes or notification badges). No neon glowing gradients, glowing shadows, or flashing cursors are used, ensuring a professional tech look.

---

## 🏗️ Part 2: Global Architecture (Layered Deck)

Sotrix organizes navigation and context using a **horizontal sheet stacking** mechanism.

### A. Default View (Focused Stream View)
Only the timeline stream and composer are visible, taking 100% of the workspace:
```text
┌──────────────────────────────────────────────────────────────┐
│  SOTRIX         [stream]  discover  messages  profile        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                      YOUR TIMELINE STREAM                    │
│                                                              │
│                      [ Create Post Composer ]                │
│                                                              │
│                      [ Post Card ]                           │
│                      [ Post Card ]                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### B. Navigation View (Clicking Explore or Messages)
A new workspace sheet slides in from the right, covering 60% of the screen. The previous sheet (the Stream) remains visible in the background at 40% opacity:
```text
┌──────────────────────────────────────────────────────────────┐
│  SOTRIX         stream  [discover]  messages  profile        │
├───────────────────────┬──────────────────────────────────────┤
│                       │  DISCOVER SPACE (New Sheet)          │
│                       │                                      │
│  YOUR TIMELINE STREAM │  🔍 Search...                        │
│  (Visible in background│  ─────────────────────────────────── │
│   at 40% opacity)     │  #Trending                           │
│                       │  • #WebDevelopment                   │
│  [ Post Card ]        │  • #AI                               │
│                       │                                      │
└───────────────────────┴──────────────────────────────────────┘
```

### C. Deep-Dive View (Opening a Profile from the Discover Space)
A third sheet slides in from the right, pushing the second sheet to the left. The user can see their browsing history and slide sheets rightward to close them:
`[ Stream Sheet (20% visible) ]` $\rightarrow$ `[ Discover Sheet (20% visible) ]` $\rightarrow$ `[ Profile Sheet (60% active focus) ]`

---

## 🧭 Part 3: Global Header Control Center

Instead of a bulky sidebar nav, a single horizontal header spans the top of the viewport:
* **Left**: Logo (`SOTRIX`) in bold monospace. Clicking it closes all stacked sheets and returns the user to the base Stream.
* **Center**: Flat text links representing the active spaces: `stream` | `discover` | `messages` | `profile`. Clicking an item slides its respective sheet into focus.
* **Right**: Small system utilities (Activity indicator `🔔` and User Avatar `👤`).

---

## 🏠 Part 4: Homepage Space — The Social Dashboard

Rather than opening directly into an endless feed of posts, the Sotrix Home is a **structured social snapshot summary**:

```text
┌──────────────────────────────────────────────────────────────┐
│ Good evening, Yugendhra                                      │
│ Here's what's happening in your network.                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✦ QUICK CREATE                                         │ │
│  │ Share a thought, image, or update...                   │ │
│  │ [📷 Attach]                                 [> Post ]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  YOUR NETWORK SNAPSHOT                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ 12 new     │ │ 3 replies  │ │ 5 follows  │               │
│  │ updates    │ │ to you     │ │            │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                              │
│  ─────────────────────────────────────────────              │
│                                                              │
│  NETWORK FEED (FOLLOWING)                                    │
│  [ Post Card: side-by-side on desktop, vertical on mobile ]  │
│  [ Post Card ]                                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Homepage Information Architecture:
1. **Welcome Context**: Personalized greetings displaying active updates count.
2. **Quick Create Box**: Expanding composer allowing immediate updates.
3. **Social Snapshot**: Horizontal quick-info badges showing updates, replies, and follow counts.
4. **Main Feed**: Timeline of posts from followed users.

---

## 🔍 Part 5: Discover Space

Sotrix Discover acts as a structured exploration engine rather than a random feed:

```text
┌─────────────────────────────────────────────────────────────┐
│                       DISCOVER                              │
│                                                             │
│   🔍 Search people, posts, or topics...                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   EXPLORE BY                                                │
│   [ People ] [ Posts ] [ Topics ]                           │
│                                                             │
├───────────────────────┬─────────────────────────────────────┤
│                       │                                     │
│  TRENDING NOW         │          DISCOVER TIMELINE          │
│  #WebDevelopment      │          [ Post ]                   │
│  #AI                  │          [ Post ]                   │
│  #Startups            │          [ Post ]                   │
│                       │                                     │
└───────────────────────┴─────────────────────────────────────┘
```

* **Left Sidebar (Inside Sheet)**: Trending tags lists (`#topic`) and suggested profiles list.
* **Right Workspace (Inside Sheet)**: Exploration timeline matching active filters/search queries.

---

## 👤 Part 6: Profile Space

A clear digital identity page. **Sotrix focuses on a timeline feed, not a photo grid**, to emphasize content-first interactions:

```text
┌──────────────────────────────────────────────────────────────┐
│                     PROFILE SPACE                            │
│                                                              │
│        ┌─────┐                                               │
│        │ Avatar│   Yugendhra                                 │
│        └─────┘     @yugen                                    │
│                                                              │
│                    Backend Developer                         │
│                    Building Sotrix 🚀                        │
│                                                              │
│                    [ Edit Profile ]                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  124 POSTS      2.4K FOLLOWERS      350 FOLLOWING            │
├──────────────────────────────────────────────────────────────┤
│  POSTS      MEDIA      ACTIVITY                              │
│                                                              │
│  [ Timeline stream of personal posts & updates ]             │
└──────────────────────────────────────────────────────────────┘
```

---

## 📄 Part 7: Post Detail Space (Discussion)

Clicking a post or comments badge opens a dedicated discussion layout instead of a simple popup dialog, highlighting active conversations:

```text
┌───────────────────────────────────────────────┐
│ ← Back                                        │
│                                               │
│ POST                                          │
│                                               │
│ 👤 Yugendhra                                  │
│                                               │
│ Building the backend architecture for Sotrix │
│ today...                                      │
│                                               │
│ ❤️ 24   💬 8                                  │
├───────────────────────────────────────────────┤
│                                               │
│ DISCUSSION                                    │
│                                               │
│ Write a response...                           │
│                                               │
│ ─────────────────────────────                 │
│                                               │
│ 👤 User                                       │
│ Great idea!                                   │
│                                               │
│ 👤 Another User                               │
│ How are you handling auth?                    │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 🔔 Part 8: Activity Space (Notifications)

Clean status logs displaying interactions:
```text
ACTIVITY

TODAY
────────────────────
👤 Alex followed you
❤️ Sarah liked your post
💬 John commented on: "Building Sotrix..."

EARLIER
────────────────────
👤 5 new people joined your network
```

---

## 💬 Part 9: Messages Space

Plan the chat UI interface layout side-by-side inside the connection space:
```text
┌──────────────────────────────────────────────────────────────┐
│ CONVERSATIONS │                 CHAT                         │
│               │                                              │
│ 🔍 Search     │  👤 Alex                     🟢 Online       │
│               │──────────────────────────────────────────────│
│ 👤 Alex       │                                              │
│ 👤 Sarah      │        Hey, did you see the new update?      │
│ 👤 John       │                                    Yeah!      │
│               │                                              │
│               │                                              │
│               │──────────────────────────────────────────────│
│               │  Write a message...                  Send →  │
└──────────────────────────────────────────────────────────────┘
```

---

## ➕ Part 10: Create Post

A command-style composer overlay dialog rather than a permanent page.
```text
┌───────────────────────────────────────────────┐
│ CREATE AN UPDATE                              │
│                                               │
│ What's happening in your world?               │
│                                               │
│                                               │
│                                               │
├───────────────────────────────────────────────┤
│ 🖼 Media      🙂 Emoji          Post →         │
└───────────────────────────────────────────────┘
```

---

## ⚙️ Part 11: Settings Page

Structured settings categories mapping account details and session metrics:
```text
SETTINGS

Account
├── Profile
├── Username
└── Email

Security
├── Password
├── Active Sessions (Displaying details like: Windows • Chrome • Last active)
└── Log out everywhere

Appearance
├── Theme
└── Display

Privacy
├── Profile visibility
└── Interaction settings
```

---

## 🧱 Part 12: Complete Sotrix Page Architecture Map

```text
                            SOTRIX
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
        HOME                DISCOVER              ACTIVITY
          │                    │                    │
          │                    ├── People           ├── Likes
          │                    ├── Posts            ├── Comments
          │                    └── Topics           └── Follows
          │
          ├── Quick Create
          ├── Social Snapshot
          └── Network Feed


              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
           PROFILE          MESSAGES         SETTINGS
              │                │
              ├── Posts        ├── Conversations
              ├── Media        └── Chat
              └── Activity


                       POST DETAIL
                            │
                            ▼
                       DISCUSSION
                            │
                       ┌────┴────┐
                       ▼         ▼
                    Comments    Interactions
```

---

## 📱 Part 13: Mobile Responsive Flow
* **Bottom Navigation**: Stacks links into a bottom tab bar.
* **Swipe Navigation**: Since screen width is limited, sheets fill 100% of the mobile view. Swiping from the left margin slides the active sheet off-screen to reveal the previous workspace layer underneath, mimicking native navigation.
