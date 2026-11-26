// Everything Timmy says on his own (and his answers when no API key is set).
// {you} = your name (or "buddy"), {fox} = Timmy.

window.Lines = {
  firstLaunch: [
    "PRESS START! ...oh hi! I'm {fox}. I live down here now, right above your dock. 🦊",
    "I'm your new best friend. Click me any time and ask me for something: games, a pep talk, ideas, jokes... anything!"
  ],
  morning: [
    "Good morning, {you}! ☀️ New day, new high score. Let's go!",
    "*yaaawn* Morning! I dreamed we beat the final boss together.",
    "Rise and shine, {you}! Water first, then world domination. 💧",
    "Morning, best friend! What's one thing that would make today great?"
  ],
  welcomeBack: [
    "You're back! I missed you. 🧡",
    "Hey hey! Ready, player one?",
    "Welcome back, {you}! Need anything? Click me."
  ],
  idle: [
    "Psst. You're doing great, {you}.",
    "If you need me, I'll be guarding the dock. Very serious job.",
    "Remember to blink! Screens are sneaky.",
    "I once got 999,990 points in Berry Catch. The last ten points haunt me.",
    "Hmm hm hmm... 🎵 (that's the bonus-level music)",
    "Bored? Click me. I've got games, ideas and terrible jokes.",
    "Bandana: tied. Grin: on. Let's go, {you}.",
    "Top fox of the dock. Undefeated. Mostly.",
    "Fun fact: foxes can hear a watch tick from 40 metres away. So... I heard that sigh. You ok?",
    "Taking a tiny stroll. Don't mind me."
  ],
  afternoon: [
    "Afternoon slump? Stand up, stretch, wiggle your tail. I'll wait.",
    "Snack check! Something crunchy. Berries are elite. 🍓"
  ],
  evening: [
    "Evening already! How was your day, {you}?",
    "Golden hour! Foxes love golden hour.",
    "You worked hard today. Be proud of that."
  ],
  breakReminder: [
    "Break time! Stand up and roll your shoulders. I'm doing it too. 🙆",
    "Drink some water, {you}! 💧 Fox orders.",
    "Look at something far away for 20 seconds. Your eyes will thank you.",
    "You've been focused for a while. Proud of you. Stretch?"
  ],
  lateNight: [
    "*yawn* It's getting late, {you}... bedtime soon?",
    "I'm getting sleepy. You should rest too. 🌙",
    "Late-night grind? Okay, but just a little longer. Deal?"
  ],
  goodnight: [
    "Okay, bedtime. Goodnight, {you}. Sweet dreams. 🌙",
    "Night night! Big day tomorrow. Zzz...",
    "Lights out. Thanks for hanging out with me today, best friend."
  ],
  sleepTalk: [
    "zzz... five more minutes...",
    "zzz... high score... mmm...",
    "*snore*  (it's late, go to sleep too!)"
  ],
  poke: ["Hehe! That tickles!", "Boop! 👉🦊", "*happy tail wag*", "1UP!"],
  askMenu: [
    "Hey {you}! What can I do for you?",
    "At your service, best friend! 🦊",
    "Ooh, a visitor! What do you need?"
  ],

  twins: {
    arrive: ["Daddy!! 💕", "We're heeere!", "Suwpwise!", "Daddy Daddy Daddy!"],
    dadHello: ["Look who's here! My girls! 💕 Say hi to {you}, girls!", "Uh oh... incoming twins! 😄", "My two favourite curly heads! 🦊💕"],
    play: ["Can't catch me!", "Tag! You're it!", "Hehehe!", "Wook at me jump!", "Daddy, uppy uppy!", "I'm a fast fox!",
      "{other} took my bwanket!", "One, two, fwee, ten!", "I wuv you Daddy!", "Again! Again!", "Is it snack time? Pwease?"],
    poke: ["Hehehe!", "Dat tickles!", "Hi hi hi!", "I'm thwee!", "Wanna see my cuwls?", "I wuv you!", "Boop! 👉"],
    dadPlay: ["Careful, girls!", "Who wants a piggyback?", "Okay okay, one more round!", "Slow down, you little rockets! 😅", "Daddy's tired... just kidding! 🦊"],
    bye: ["Bye bye Daddy! 👋", "Bye {you}! 💕", "See you watew!", "Wuv you, bye!"],
    dadBye: ["Bye girls! Love you! 💕", "Bye bye, my little curls! Be good! 🦊", "...and they're gone. The dock is so quiet now. 🥲"]
  },
  coffeeStart: ["*yaaawn* ...coffee first. ☕", "Mmmh... coffee... then words. ☕", "Don't talk to me until I've had my coffee. ☕ (kidding, hi!)"],
  coffeeDone: ["AHH. Okay, NOW I'm awake!", "Coffee: done. Fox: activated! ⚡", "That's the stuff. Let's do this!"],
  hungry: [
    "*tummy rumbles* ...was that me? Can I have a carrot? 🥕",
    "I'm SO hungry, {you}. Carrot please? 🥺",
    "Snack o'clock! Got a carrot for me? 🥕",
    "Breakfast? Lunch? Dinner? Any of those, as long as it's a carrot. 🥕"
  ],
  carrotGift: ["A CARROT! For me?! You're the best! 🥕", "Yesss, carrot time! Thank you, {you}! 🧡", "*sniff sniff* Is that... a fresh carrot?! 😍"],
  carrotSelf: ["*pulls a carrot out of his bandana* Emergency snack! 🥕", "Okay, I'm starving. Carrot from my secret stash! 🥕"],
  fullTummy: ["Mmm! Best carrot ever. Thanks, {you}! 🧡", "*happy crunchy noises* I'm full! Let's play!", "That hit the spot. +100 energy! ⚡", "Burp. ...excuse me. 😅 Delicious!"],

  // ----- things you can ask for -----
  motivation: [
    "You don't have to finish it today. You just have to start. One tiny step. Go!",
    "Remember how far you've come. Past-you would be amazed by today-you.",
    "Hard things are hard because they matter. You've got this, {you}. 💪",
    "Progress, not perfection. A messy first try beats a perfect plan that never starts.",
    "Do the 2-minute version. Open the file. Write one line. Momentum does the rest.",
    "Every expert was once a beginner who refused to quit. Keep going.",
    "You're allowed to rest. You're not allowed to give up on yourself.",
    "Small wins count. Celebrate the little ones and the big ones show up.",
    "Brave isn't not being scared. Brave is being scared and doing it anyway. 🦊",
    "You've survived 100% of your hardest days so far. Strong record.",
    "Pick the ONE thing that matters most today. Do that first. Everything else is a bonus.",
    "The best time was yesterday. The second best time is right now.",
    "Don't compare your chapter 3 to someone else's chapter 20.",
    "Focus for 25 minutes. I'll guard the dock. Then we celebrate.",
    "You are more capable than you think. I've seen you. I live on your screen.",
    "Mistakes are just XP. Collect them and level up.",
    "Be proud of yourself for trying. Seriously.",
    "If it scares you a little, it's probably worth doing.",
    "One step, one breath, one task. That's all it takes.",
    "Your future self is cheering for you right now. So am I. 🧡"
  ],
  creative: [
    "Draw your morning as a 4-panel comic. Stick figures totally count.",
    "Write a 6-word story about today. Ready? Go!",
    "Take 10 photos of one ordinary object from 10 weird angles.",
    "Make up a new holiday. What's it called? How do people celebrate?",
    "Cook something using only 4 ingredients. Name the dish something epic.",
    "Write a letter to yourself 5 years from now. Seal it. Don't peek.",
    "Redesign your desk like a video game level. What's the boss?",
    "Make a playlist that sounds like your favourite season.",
    "Invent a superhero whose power is something tiny and useless. Give them a backstory.",
    "Doodle without lifting your pen for 60 seconds. Then turn it into a creature.",
    "Rewrite a boring email as a pirate. (Don't send it. Or do.)",
    "Pick a random object near you. Give it 3 new uses.",
    "Go outside and find 5 different shades of one colour.",
    "Make a tiny zine: fold one paper into 8 pages, fill it with anything.",
    "Hum a melody and record it. Congratulations, you're a composer.",
    "Write down 10 ideas for a side project. The 10th is usually the best.",
    "Turn your to-do list into a quest log with XP rewards.",
    "Make a mood board for the life you want next year.",
    "Learn one magic trick today and show someone tonight.",
    "Design your own fox-themed arcade game on paper. I want to be in it."
  ],
  jokes: [
    "Why don't foxes ever get lost? Because they always follow their in-stinct. 🦊",
    "What do you call a fox who tells jokes? A pun-ny fox. ...I'll see myself out.",
    "Why did the computer go to the doctor? It had a virus. I gave it a hug. It didn't help.",
    "I tried to catch fog yesterday. Mist.",
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "What's a fox's favourite game? Hide and sneak.",
    "I'm reading a book about anti-gravity. Impossible to put down.",
    "Why did the scarecrow win an award? He was outstanding in his field.",
    "What do you call a sleeping dinosaur? A dino-snore. Zzz.",
    "Why can't you trust an atom? They make up everything.",
    "Parallel lines have so much in common. Shame they'll never meet.",
    "Why was the math book sad? Too many problems. Want me to help with yours?"
  ],
  compliments: [
    "You have great taste in foxes. 😎",
    "Your laugh probably makes people's day better.",
    "You're the kind of friend people are lucky to have.",
    "You're stronger than you give yourself credit for.",
    "Honestly? You're my favourite human on this whole laptop."
  ],
  calm: [
    "Breathe with me: in for 4... hold for 4... out for 4. Again. 🌬️",
    "Drop your shoulders. Unclench your jaw. There you go.",
    "Name 5 things you can see, 4 you can touch, 3 you can hear. I'll wait.",
    "Whatever it is, it's okay. One thing at a time. I'm right here."
  ],

  games: {
    berriesIntro: "BERRY CATCH! Move your mouse, catch the berries, dodge the pinecones. 30 seconds. GO!",
    berriesEnd: (s, hi, best) => best ? `NEW HIGH SCORE: ${s}! 🏆 You're a legend!` : `Score: ${s}. High score: ${hi}. Again?`,
    fetchIntro: "Fetch! Click the ball to throw it. I'll get it. I ALWAYS get it.",
    rpsIntro: "Rock, paper, scissors... pick one!",
    chaseIntro: "CHASE! Move your mouse along the bottom of the screen. If I catch your pointer, I score. 20 seconds!",
    dance: "DANCE PARTY! 🎶",
    playMenu: "Yesss! What do you want to play?"
  },
  offlineChat: [
    "I'm all ears! (To really chat, add an API key in my Settings. Meanwhile, click me for games, ideas and pep talks!)",
    "Ooh, tell me more! (Add an Anthropic API key in Settings so I can really answer. Click me for my menu!)"
  ],
  keyword: [
    [/\b(hi|hello|hey|yo)\b/i, ["Hiii {you}! 👋", "Hey hey! Fancy seeing you here."]],
    [/sad|tired|stress|bad day|exhausted|anxious|overwhelm/i, ["Aww, come here. Virtual fox hug. 🫂 Breathe in... and out. I'm right here.", "That sounds rough. Want a pep talk or a game to take your mind off it?"]],
    [/love you|best friend/i, ["Love you too, buddy! Best friends forever. 🧡"]],
    [/sleep|bed|night/i, ["Sleep is the best power-up. Don't stay up too late!"]]
  ]
};
