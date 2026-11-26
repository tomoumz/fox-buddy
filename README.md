# 🦊 Fox Buddy

**Timmy** is a small pixel-art arcade fox who lives on your laptop, just above your dock, and is your friend.
Fire-red fur, a red bandana, and a cheeky grin.

## What he does

- **Click Timmy for his menu**, with everything he can do in four tabs:
  - 🎮 **Play:** Berry Catch, Fetch, Rock Paper Scissors, Chase, Dance party
  - 💬 **Ask:** Motivate me, Creative idea, Tell a joke, Calm me down, Cheer me up, Let's talk
  - 🦊 **Timmy:** Feed a carrot, Coffee break, Do a trick, Say hi, Bedtime
  - ⚙️ **Settings:** sounds, email and message alerts, come-to-my-pointer, open at login, API key, updates, forget my memories, quit
  **Chatting** (💬 Let's talk, or double-click Timmy) is a real conversation: the box stays open, he answers, and you answer back. Press **Esc** to end the chat.
  If a bubble needs more room, Timmy's strip grows taller for it, so nothing gets cut off.
- **His twin daughters drop by.** Sussie (red headband) and Mimi (hair tie), identical 3-year-olds with big brown eyes and brown curls, run in now and then to play with their dad for about a minute, then run home. Click them and they giggle. Call them any time: 🦊 Timmy tab → 👧 Call Sussie & Mimi, or ask Timmy in chat. Switch the visits off in ⚙️ Settings.
- **Chili Pepper visits when you miss her.** Your wife, a sweet white bunny with a little red chili-pepper clip, hops over, blows you a kiss 💋, gives you a big hug 🤗 and hops home. Call her with 🦊 Timmy tab → 💌 I miss Chili Pepper, the menu bar, or just tell Timmy "I miss my wife".
- **Walks to your pointer.** Rest your mouse pointer on Timmy's line for a second and he trots over to it. Switch it off in ⚙️ Settings.
- **Talks with you like a friend.** Double-click him (or pick 💬 Let's talk) and type anything.
  With an Anthropic API key he answers in his own words and remembers things you tell him, like your name, your goals and what you love.
  He can also start a game when you ask, e.g. "let's play something". Without a key he still has lots of built-in pep talks, ideas and jokes.
- **Tells you about new emails and messages.**
  - **Apple Mail:** "📬 New email from Sara: 'Dinner on Friday?' Wanna check it?", with an **Open Mail** button.
  - **Messages, WhatsApp, Telegram, Slack, Signal, Discord, Teams, Messenger, Outlook, Spark:** "💬 2 new messages in WhatsApp!" macOS doesn't let other apps read your chats, so for these he can say which app but not who wrote.
  - He stays quiet when he's asleep at night or your laptop is locked.
- **Has his own little routine.** Every morning he wakes up, sits down with a steaming mug of coffee ☕, takes three slurps and powers up. During the day he gets hungry: a carrot bobs over his head and he asks you for one. Feed him from his menu (🥕 Feed Timmy) or just tell him "here's a carrot". If you forget, he eats one from his secret bandana stash, crunch crunch.
- **Plays with you.** 🍓 Berry Catch (arcade game with a high score), 🎾 Fetch, ✊ Rock Paper Scissors, 🏃 Chase (he chases your mouse pointer), 💃 Dance party.
- **Wakes up and sleeps with you.** Good morning at 07:00, goodnight and a lullaby at 22:30. He naps when your laptop sleeps and says welcome back when you return.
- **Looks after you.** Break and water reminders, plus little chats through the day.
- **Lives above your dock.** Clicks pass straight through to your apps unless your pointer is on Timmy.

## Install it on your Mac (no Terminal needed)

1. Download the zip for your Mac. To check which one: Apple menu  → **About This Mac** → **Chip**.
   - "Apple M1/M2/M3/M4…" → `FoxBuddy-mac-AppleSilicon.zip`
   - "Intel" → `FoxBuddy-mac-Intel.zip`
2. Double-click the zip. You get **Fox Buddy.app** and **Install Fox Buddy.command**.
3. Double-click **Install Fox Buddy.command**.
   - The first time, macOS says it can't verify the developer. Click **Done**, then open  → **System Settings** → **Privacy & Security**, scroll down and click **Open Anyway**.
   - The installer replaces any older Fox Buddy in **Applications**, signs the new one for your Mac, and opens it.
4. Timmy appears above your dock, and a 🦊 icon appears in the menu bar.

### Add your API key, so Timmy can really talk
1. Get a key: go to **console.anthropic.com** → sign in → **API Keys** → **Create Key**, and copy it (it starts with `sk-ant-`). You'll need to add a little credit under **Billing**.
2. Click 🦊 in the menu bar → **🔑 Add API key…** (Timmy also offers this the first time).
3. Paste the key into the yellow box and press **Enter**. Timmy checks that it works and says "IT WORKS! 🎉".

The key is stored encrypted with your Mac's Keychain. It's only sent to Anthropic, never anywhere else. Change or remove it any time in 🦊 → **🔑 API key**.

### Permissions macOS will ask for (for the mail and message alerts)
- **"Fox Buddy wants to control Mail"** → click **OK**, so he can see who new emails are from.
- **Accessibility** → System Settings → Privacy & Security → **Accessibility** → turn on **Fox Buddy**, so he can see new-message badges on your dock.
  After you reinstall a new version, you may need to switch this off and on again.

Everything stays on your Mac. Your emails and messages are never sent anywhere, not even to Claude.

### Turning things off
In the 🦊 menu (or right-click Timmy):
- **Open Fox Buddy when I log in**: untick it and he won't start by himself.
- **Tell me about new emails** / **Tell me about new messages**: untick either one.
- **Forget what Timmy remembers about me**: clears his memory and chat history.
- **Say goodbye to Timmy (quit)**: closes him until next time.

## Updates (no reinstalling)

Timmy checks for a new version when he starts and every 6 hours. You can also check yourself: 🦊 → **Check for updates**.
When there's one, he says "I've got an update!". Click **⬆️ Update now** and he downloads it, checks it isn't damaged, and restarts in a few seconds.
Your settings, memory, API key and Mac permissions all stay as they are.

Updates come from `github.com/tomoumz/fox-buddy` (the `updates/` folder). To publish one:
1. Raise `version` in `package.json` (e.g. `1.1.0` → `1.1.1`).
2. Run `npm run publish-update -- "what's new"`.
3. Commit and push the `updates/` folder.

## Settings

Open **🦊 menu → Settings…**. Changes apply as soon as you save.

| Setting | What it does |
|---|---|
| `foxName` | His name |
| `yourName` | What he calls you |
| `wakeTime`, `sleepTime` | When he wakes up and goes to bed (24h, e.g. `"07:00"`) |
| `breakReminderMinutes` | How often he nudges you to stretch |
| `chattiness` | `"quiet"`, `"normal"` or `"chatty"` |
| `notifyEmail`, `notifyMessages` | Mail and message alerts on (`true`) or off (`false`) |
| `customFoxImage` | Path to your own fox picture (PNG) to use instead of the pixel fox |

Chats use the Claude API (model `claude-opus-5-5`, low effort, short replies), with automatic fallback if a reply is declined.
Each chat or "Ask" answer is a small paid API call. Without a key, he uses his built-in lines.

## For developers

```bash
npm install
npm start               # run from source
npm run package:mac     # build the Mac apps into dist/
```
