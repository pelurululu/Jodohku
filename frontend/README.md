# Jodohku — Project Structure

## Folder & File Overview

```
jodohku/
├── index.html          ← Main entry point (open this in browser)
│
├── css/
│   ├── variables.css   ← CSS custom properties (:root) & base resets
│   ├── layout.css      ← Page/layout classes, ambient FX orbs & grain
│   └── components.css  ← All UI components (buttons, forms, cards, chat, modals, etc.)
│
└── js/
    ├── state.js        ← App state (S object), save/load, config constants, shared utils
    ├── validation.js   ← Form validators (phone, name, DOB, email, IC) & anti-scam patterns
    ├── auth.js         ← Photo upload, Registration (3 steps), Login (OTP flow)
    ├── feed.js         ← Mock data, daily feed loading, candidate cards, match/action logic
    ├── chat.js         ← Tab switching, chat list, chat window, message sending
    ├── profile.js      ← Profile refresh, payment/tiers, subscription reminders, insights
    └── psychometric.js ← 30-question test data, test builder, scoring & result calculation
```

## How to Run

Just open `index.html` in any browser. No build tools or server needed.

## Demo Login

1. Enter any Malaysian phone number (e.g. `0123456789`)
2. Click "Hantar Kod OTP"
3. Enter `123456` as the OTP code

## File Responsibilities

| File | What to edit here |
|------|-------------------|
| `css/variables.css` | Colours, fonts, spacing tokens |
| `css/layout.css` | Page structure, ambient animation |
| `css/components.css` | Any UI component appearance |
| `js/state.js` | Add new state fields, change API URL |
| `js/validation.js` | Change validation rules |
| `js/auth.js` | Registration steps, OTP flow |
| `js/feed.js` | Mock candidate data, match logic |
| `js/chat.js` | Chat shortcuts, message behaviour |
| `js/profile.js` | Tier prices, subscription logic |
| `js/psychometric.js` | Questions, scoring, personality types |
| `index.html` | Page structure, HTML layout |
