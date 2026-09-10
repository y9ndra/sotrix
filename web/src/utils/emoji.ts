export interface EmojiItem {
  char: string;
  name: string;
  category: "smileys" | "gestures" | "hearts" | "tech" | "objects";
  keywords: string[];
}

export const EMOJI_CATEGORIES: { id: EmojiItem["category"]; label: string; icon: string }[] = [
  { id: "smileys", label: "Smileys", icon: "😀" },
  { id: "gestures", label: "Gestures", icon: "👍" },
  { id: "hearts", label: "Hearts & Fire", icon: "🔥" },
  { id: "tech", label: "Cyber & Tech", icon: "🤖" },
  { id: "objects", label: "Symbols", icon: "⚡" },
];

export const EMOJI_LIST: EmojiItem[] = [
  // Smileys & Emotions
  { char: "😀", name: "grinning", category: "smileys", keywords: ["happy", "smile", "grin"] },
  { char: "😃", name: "smiley", category: "smileys", keywords: ["happy", "smile", "joy"] },
  { char: "😄", name: "smile", category: "smileys", keywords: ["happy", "laugh"] },
  { char: "😁", name: "beaming", category: "smileys", keywords: ["happy", "grin"] },
  { char: "😆", name: "laughing", category: "smileys", keywords: ["happy", "laugh", "xd"] },
  { char: "😂", name: "joy", category: "smileys", keywords: ["laugh", "cry", "tears", "lol", "lmao"] },
  { char: "🤣", name: "rofl", category: "smileys", keywords: ["laugh", "floor", "rolling"] },
  { char: "😊", name: "blush", category: "smileys", keywords: ["happy", "smile", "proud"] },
  { char: "😇", name: "innocent", category: "smileys", keywords: ["angel", "halo", "good"] },
  { char: "🙂", name: "slight_smile", category: "smileys", keywords: ["smile", "ok"] },
  { char: "🙃", name: "upside_down", category: "smileys", keywords: ["silly", "irony"] },
  { char: "😉", name: "wink", category: "smileys", keywords: ["wink", "flirt"] },
  { char: "😌", name: "relieved", category: "smileys", keywords: ["peace", "calm"] },
  { char: "😍", name: "heart_eyes", category: "smileys", keywords: ["love", "crush", "heart"] },
  { char: "🥰", name: "in_love", category: "smileys", keywords: ["love", "hearts", "adore"] },
  { char: "😘", name: "kissing_heart", category: "smileys", keywords: ["kiss", "love"] },
  { char: "😋", name: "yum", category: "smileys", keywords: ["delicious", "tasty", "silly"] },
  { char: "😛", name: "tongue", category: "smileys", keywords: ["playful", "joke"] },
  { char: "😜", name: "wink_tongue", category: "smileys", keywords: ["crazy", "party", "joke"] },
  { char: "🤪", name: "zany", category: "smileys", keywords: ["wild", "crazy"] },
  { char: "😎", name: "sunglasses", category: "smileys", keywords: ["cool", "matrix", "swag"] },
  { char: "🤓", name: "nerd", category: "smileys", keywords: ["geek", "glasses", "code", "dev"] },
  { char: "🧐", name: "monocle", category: "smileys", keywords: ["inspect", "curious", "investigate"] },
  { char: "😏", name: "smirk", category: "smileys", keywords: ["smug", "flirt"] },
  { char: "😒", name: "unamused", category: "smileys", keywords: ["meh", "bored"] },
  { char: "🙄", name: "roll_eyes", category: "smileys", keywords: ["whatever", "bored"] },
  { char: "😬", name: "grimacing", category: "smileys", keywords: ["awkward", "yikes"] },
  { char: "😮‍💨", name: "sigh", category: "smileys", keywords: ["relief", "exhausted"] },
  { char: "🤥", name: "lying", category: "smileys", keywords: ["pinocchio", "cap"] },
  { char: "😴", name: "sleeping", category: "smileys", keywords: ["tired", "sleep", "zzz"] },
  { char: "😷", name: "mask", category: "smileys", keywords: ["sick", "mask"] },
  { char: "🤯", name: "mind_blown", category: "smileys", keywords: ["shock", "crazy", "boom", "brain"] },
  { char: "🥳", name: "partying", category: "smileys", keywords: ["celebrate", "birthday", "party"] },
  { char: "🤫", name: "shh", category: "smileys", keywords: ["quiet", "secret"] },
  { char: "🤔", name: "thinking", category: "smileys", keywords: ["hmm", "consider", "ponder"] },
  { char: "🤐", name: "zipper", category: "smileys", keywords: ["silent", "mute"] },
  { char: "🤨", name: "raised_eyebrow", category: "smileys", keywords: ["doubt", "skeptical"] },
  { char: "😐", name: "neutral", category: "smileys", keywords: ["meh", "flat"] },
  { char: "😑", name: "expressionless", category: "smileys", keywords: ["deadpan"] },
  { char: "😶", name: "no_mouth", category: "smileys", keywords: ["mute", "speechless"] },
  { char: "🥱", name: "yawn", category: "smileys", keywords: ["bored", "sleepy"] },
  { char: "😤", name: "triumph", category: "smileys", keywords: ["huff", "proud", "angry"] },
  { char: "😡", name: "rage", category: "smileys", keywords: ["angry", "mad"] },
  { char: "🤬", name: "cursing", category: "smileys", keywords: ["swearing", "angry"] },
  { char: "😈", name: "devil", category: "smileys", keywords: ["mischief", "evil"] },
  { char: "💀", name: "skull", category: "smileys", keywords: ["dead", "skeleton", "rip"] },
  { char: "☠️", name: "crossbones", category: "smileys", keywords: ["danger", "pirate", "dead"] },
  { char: "💩", name: "poop", category: "smileys", keywords: ["crap", "funny"] },
  { char: "🤡", name: "clown", category: "smileys", keywords: ["circus", "fool", "joke"] },
  { char: "👻", name: "ghost", category: "smileys", keywords: ["spooky", "phantom"] },

  // Gestures & People
  { char: "👋", name: "wave", category: "gestures", keywords: ["hi", "hello", "bye"] },
  { char: "🤚", name: "raised_back_hand", category: "gestures", keywords: ["stop", "hand"] },
  { char: "🖐️", name: "hand_fingers_spread", category: "gestures", keywords: ["five", "hand"] },
  { char: "✋", name: "hand", category: "gestures", keywords: ["stop", "highfive"] },
  { char: "👌", name: "ok_hand", category: "gestures", keywords: ["perfect", "ok", "fine"] },
  { char: "🤌", name: "pinched_fingers", category: "gestures", keywords: ["italian", "chef"] },
  { char: "🤏", name: "pinching_hand", category: "gestures", keywords: ["small", "tiny", "little"] },
  { char: "✌️", name: "peace", category: "gestures", keywords: ["victory", "two", "peace"] },
  { char: "🤞", name: "crossed_fingers", category: "gestures", keywords: ["luck", "hope"] },
  { char: "🤟", name: "love_you_gesture", category: "gestures", keywords: ["ily", "rock"] },
  { char: "🤘", name: "sign_of_horns", category: "gestures", keywords: ["rock", "metal"] },
  { char: "🤙", name: "call_me", category: "gestures", keywords: ["shaka", "hangloose"] },
  { char: "👈", name: "point_left", category: "gestures", keywords: ["left", "direction"] },
  { char: "👉", name: "point_right", category: "gestures", keywords: ["right", "direction"] },
  { char: "👆", name: "point_up", category: "gestures", keywords: ["up", "this"] },
  { char: "👇", name: "point_down", category: "gestures", keywords: ["down", "below"] },
  { char: "👍", name: "thumbs_up", category: "gestures", keywords: ["like", "yes", "good", "approve", "+1"] },
  { char: "👎", name: "thumbs_down", category: "gestures", keywords: ["dislike", "no", "bad", "-1"] },
  { char: "✊", name: "fist", category: "gestures", keywords: ["power", "strength"] },
  { char: "👊", name: "punch", category: "gestures", keywords: ["fist_bump", "fight"] },
  { char: "🤛", name: "left_fist", category: "gestures", keywords: ["fistbump"] },
  { char: "🤜", name: "right_fist", category: "gestures", keywords: ["fistbump"] },
  { char: "👏", name: "clap", category: "gestures", keywords: ["applause", "praise", "bravo"] },
  { char: "🙌", name: "raised_hands", category: "gestures", keywords: ["celebrate", "hooray"] },
  { char: "👐", name: "open_hands", category: "gestures", keywords: ["hug"] },
  { char: "🤲", name: "palms_up", category: "gestures", keywords: ["prayer", "offering"] },
  { char: "🤝", name: "handshake", category: "gestures", keywords: ["agreement", "deal", "partner"] },
  { char: "🙏", name: "pray", category: "gestures", keywords: ["please", "thank_you", "hope", "respect"] },
  { char: "💪", name: "flex", category: "gestures", keywords: ["strong", "bicep", "muscle", "workout"] },
  { char: "👀", name: "eyes", category: "gestures", keywords: ["look", "see", "watch", "interesting"] },
  { char: "🧠", name: "brain", category: "gestures", keywords: ["smart", "intellect", "mind"] },

  // Hearts & Fire
  { char: "🔥", name: "fire", category: "hearts", keywords: ["hot", "lit", "hype", "flame"] },
  { char: "❤️", name: "red_heart", category: "hearts", keywords: ["love", "heart", "<3"] },
  { char: "💚", name: "green_heart", category: "hearts", keywords: ["love", "matrix", "sotrix", "emerald"] },
  { char: "💙", name: "blue_heart", category: "hearts", keywords: ["love", "heart"] },
  { char: "💜", name: "purple_heart", category: "hearts", keywords: ["love", "heart"] },
  { char: "🖤", name: "black_heart", category: "hearts", keywords: ["love", "dark", "heart"] },
  { char: "🤍", name: "white_heart", category: "hearts", keywords: ["love", "pure", "heart"] },
  { char: "💖", name: "sparkling_heart", category: "hearts", keywords: ["love", "sparkle"] },
  { char: "💗", name: "growing_heart", category: "hearts", keywords: ["love", "pulse"] },
  { char: "💓", name: "beating_heart", category: "hearts", keywords: ["love", "heartbeat"] },
  { char: "💞", name: "revolving_hearts", category: "hearts", keywords: ["love"] },
  { char: "💕", name: "two_hearts", category: "hearts", keywords: ["love"] },
  { char: "💔", name: "broken_heart", category: "hearts", keywords: ["heartbreak", "sad"] },
  { char: "❤️‍🔥", name: "heart_on_fire", category: "hearts", keywords: ["passion", "burning", "hot"] },
  { char: "✨", name: "sparkles", category: "hearts", keywords: ["magic", "clean", "glitter", "star"] },
  { char: "⭐", name: "star", category: "hearts", keywords: ["favorite", "gold"] },
  { char: "🌟", name: "glowing_star", category: "hearts", keywords: ["shine", "sparkle"] },
  { char: "💥", name: "collision", category: "hearts", keywords: ["boom", "explode", "bang"] },

  // Cyber & Tech
  { char: "🤖", name: "robot", category: "tech", keywords: ["bot", "ai", "cyber", "agent"] },
  { char: "💻", name: "laptop", category: "tech", keywords: ["computer", "code", "dev", "tech"] },
  { char: "🖥️", name: "desktop", category: "tech", keywords: ["screen", "monitor", "pc"] },
  { char: "⌨️", name: "keyboard", category: "tech", keywords: ["type", "keys", "input"] },
  { char: "🖱️", name: "mouse", category: "tech", keywords: ["click", "cursor"] },
  { char: "🕹️", name: "joystick", category: "tech", keywords: ["game", "play", "controller"] },
  { char: "🎮", name: "gamepad", category: "tech", keywords: ["game", "controller", "gaming"] },
  { char: "👾", name: "alien_monster", category: "tech", keywords: ["retro", "invader", "8bit", "arcade"] },
  { char: "🚀", name: "rocket", category: "tech", keywords: ["launch", "fast", "space", "moon"] },
  { char: "🛰️", name: "satellite", category: "tech", keywords: ["orbit", "space", "signal"] },
  { char: "🌐", name: "globe", category: "tech", keywords: ["internet", "web", "network", "world"] },
  { char: "⚡", name: "zap", category: "tech", keywords: ["lightning", "electricity", "fast", "power"] },
  { char: "🔋", name: "battery", category: "tech", keywords: ["energy", "charge"] },
  { char: "🔌", name: "plug", category: "tech", keywords: ["connection", "electric"] },
  { char: "🔒", name: "lock", category: "tech", keywords: ["secure", "private", "encryption"] },
  { char: "🔓", name: "unlock", category: "tech", keywords: ["open", "access"] },
  { char: "🔑", name: "key", category: "tech", keywords: ["password", "access", "auth"] },
  { char: "📱", name: "mobile_phone", category: "tech", keywords: ["phone", "screen", "cell"] },
  { char: "🎧", name: "headphones", category: "tech", keywords: ["music", "audio", "listen"] },
  { char: "📸", name: "camera", category: "tech", keywords: ["photo", "picture"] },

  // Objects & Symbols
  { char: "💯", name: "hundred", category: "objects", keywords: ["100", "score", "perfect", "full"] },
  { char: "🎉", name: "party_popper", category: "objects", keywords: ["tada", "celebrate", "congrats"] },
  { char: "🎊", name: "confetti", category: "objects", keywords: ["party", "celebrate"] },
  { char: "🏆", name: "trophy", category: "objects", keywords: ["winner", "champion", "prize"] },
  { char: "🥇", name: "first_medal", category: "objects", keywords: ["gold", "1st", "winner"] },
  { char: "🎯", name: "dart", category: "objects", keywords: ["target", "bullseye", "goal"] },
  { char: "💎", name: "gem", category: "objects", keywords: ["diamond", "valuable", "crystal"] },
  { char: "👑", name: "crown", category: "objects", keywords: ["king", "queen", "royalty", "leader"] },
  { char: "💡", name: "lightbulb", category: "objects", keywords: ["idea", "bright", "smart"] },
  { char: "📌", name: "pin", category: "objects", keywords: ["pushpin", "attach", "save"] },
  { char: "📍", name: "round_pushpin", category: "objects", keywords: ["location", "map", "marker"] },
  { char: "✅", name: "check_mark", category: "objects", keywords: ["yes", "done", "correct", "verified"] },
  { char: "❌", name: "cross_mark", category: "objects", keywords: ["no", "cancel", "wrong"] },
  { char: "⚠️", name: "warning", category: "objects", keywords: ["caution", "alert"] },
  { char: "🚨", name: "police_siren", category: "objects", keywords: ["alert", "emergency", "alarm"] },
  { char: "🟩", name: "green_square", category: "objects", keywords: ["matrix", "emerald", "block"] },
  { char: "☕", name: "coffee", category: "objects", keywords: ["tea", "drink", "morning", "caffeine"] },
  { char: "🍕", name: "pizza", category: "objects", keywords: ["food", "slice"] },
  { char: "🍻", name: "beers", category: "objects", keywords: ["cheers", "drink", "party"] },
];

/**
 * Common typing shortcodes mapped directly to emojis.
 * Matches common text emoticons and Slack/Discord-style shortcodes.
 */
export const SHORTCODE_MAP: Record<string, string> = {
  ":)": "😊",
  ":-)": "😊",
  ":D": "😃",
  ":-D": "😃",
  ":(": "🙁",
  ":-(": "🙁",
  ";)": "😉",
  ";-)": "😉",
  ":P": "😛",
  ":-P": "😛",
  ":p": "😛",
  ":-p": "😛",
  "<3": "❤️",
  "</3": "💔",
  ":O": "😮",
  ":-O": "😮",
  ":o": "😮",
  ":-o": "😮",
  "8)": "😎",
  "B)": "😎",
  ":|": "😐",
  ":-|": "😐",
  ":/": "😕",
  ":-/": "😕",
  ":*": "😘",
  ":-*": "😘",
  ":fire:": "🔥",
  ":heart:": "❤️",
  ":green_heart:": "💚",
  ":100:": "💯",
  ":rocket:": "🚀",
  ":star:": "⭐",
  ":sparkles:": "✨",
  ":thumb:": "👍",
  ":thumbsup:": "👍",
  ":+1:": "👍",
  ":thumbsdown:": "👎",
  ":-1:": "👎",
  ":clap:": "👏",
  ":pray:": "🙏",
  ":robot:": "🤖",
  ":bot:": "🤖",
  ":dev:": "💻",
  ":laptop:": "💻",
  ":matrix:": "🟩",
  ":party:": "🎉",
  ":tada:": "🎉",
  ":cry:": "😢",
  ":joy:": "😂",
  ":lol:": "😂",
  ":skull:": "💀",
  ":dead:": "💀",
  ":eyes:": "👀",
  ":check:": "✅",
  ":zap:": "⚡",
  ":bulb:": "💡",
  ":target:": "🎯",
  ":cool:": "😎",
  ":wave:": "👋",
  ":shrug:": "🤷",
  ":muscle:": "💪",
  ":flex:": "💪",
};

/**
 * Converts shortcodes and text emoticons within a given string to real emojis.
 * Only converts when a word or phrase matches a shortcode key or is followed by space/end.
 */
export function convertEmojiShortcodes(text: string): string {
  if (!text) return "";

  let result = text;

  // Replace colon-style :code: shortcodes
  result = result.replace(/:[a-zA-Z0-9_+]+:/g, (match) => {
    return SHORTCODE_MAP[match.toLowerCase()] || match;
  });

  // Replace text emoticons (e.g. :) :D <3 ;) when separated by spaces or at boundaries
  for (const [emoticon, emoji] of Object.entries(SHORTCODE_MAP)) {
    if (emoticon.startsWith(":") && emoticon.endsWith(":")) continue; // already covered
    // Escape special regex characters in the emoticon
    const escaped = emoticon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Look for emoticon bounded by whitespace or start/end of line
    const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "g");
    result = result.replace(regex, `$1${emoji}`);
  }

  return result;
}

/**
 * Inserts an emoji at the specific cursor position in an input/textarea element
 * and returns the updated text and new cursor offset.
 */
export function insertEmojiAtCursor(
  text: string,
  emoji: string,
  selectionStart: number | null,
  selectionEnd: number | null
): { newText: string; newCursor: number } {
  const start = selectionStart ?? text.length;
  const end = selectionEnd ?? text.length;

  const before = text.slice(0, start);
  const after = text.slice(end);

  const newText = before + emoji + after;
  const newCursor = start + emoji.length;

  return { newText, newCursor };
}
