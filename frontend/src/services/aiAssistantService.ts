/**
 * Grounded SignBridge assistant fallback.
 * It never invents a sign movement: every sign answer comes from SignRepository.
 */
import { SignRepository, SignDefinition } from '../../../ml/sign_repository';
import { getAlphabetGuidance } from '../../../ml/alphabet_guidance';

export interface AssistantMessage { role: 'user' | 'assistant'; text: string; }

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9_\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (value: string) => new Set(normalize(value).replace(/_/g, ' ').split(' ').filter(Boolean));

const findSign = (query: string, signs: SignDefinition[]) => {
  const q = normalize(query);
  const qWords = words(q);
  const scored = signs.map(sign => {
    const candidates = [sign.id, sign.canonicalName, sign.displayName, sign.englishMeaning, ...sign.aliases]
      .map(normalize);
    let score = 0;
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (q.includes(candidate) || candidate.includes(q)) score += candidate.length > 4 ? 8 : 4;
      for (const token of words(candidate)) if (token.length > 2 && qWords.has(token)) score += 2;
    }
    return { sign, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || b.sign.canonicalName.length - a.sign.canonicalName.length);
  return scored[0]?.sign || null;
};

export class ClientAIAssistantService {
  public static answerQuery(userPrompt: string, _history: AssistantMessage[] = []): string {
    const q = normalize(userPrompt);
    const signs = SignRepository.getAllSigns();
    const stats = SignRepository.getStatistics();
    const sign = findSign(q, signs);

    if (!q) return 'Ask me about an ISL sign, how to practise it, camera recognition, the Learning Hub, Dictionary, Games, or assessment.';

    const alphabetMatch = q.match(/\b(?:letter\s+)?([a-z])\b/);
    const alphabet = alphabetMatch ? getAlphabetGuidance(alphabetMatch[1]) : null;
    if (alphabet && /(how|perform|do|make|sign|show|learn|practice|practise|image|hand)/.test(q)) {
      return `🤟 **ISL alphabet ${alphabet.letter}**\n\n[[SIGN_IMAGE:${alphabet.letter}]]\n\n**Easy way to learn it:** This is a **static reference pose** from the supplied A–Z dataset. It uses **${alphabet.hands.toLowerCase()}**. Look at the picture and copy the exact finger and thumb arrangement.\n\n**Check yourself:** 1) number of hands → 2) finger positions → 3) thumb position → 4) palm direction. Hold the pose steadily. The dataset does not provide verified written movement mechanics for alphabet poses, so I will not make up a movement.`;
    }

    if (/^(hi|hey|namaste)\b/.test(q) || q.includes('what can you do')) {
      return `👋 **I’m your SignBridge ISL Assistant.**\n\nI can help you with:\n- **How to perform a sign** — step-by-step from the verified dictionary\n- **Meaning & example** — what the sign means and where to use it\n- **Camera support** — whether SignBridge currently recognizes it\n- **Learning** — what to study next\n- **Practice & Games** — how to use those sections\n- **Assessment** — how the practical test works\n\nTry: **“How do I perform WATER?”** or **“Can the camera recognize HELLO?”**`;
    }

    if (q.includes('how many') && (q.includes('sign') || q.includes('word')) || q.includes('dictionary size') || q.includes('total signs')) {
      return `📚 **SignBridge Dictionary**\n\n- **${stats.totalSigns}** signs in the current repository\n- **${stats.cameraRecognizable}** classes currently marked for live camera recognition\n- 4 learning levels, from foundations to advanced/emergency vocabulary\n\nOpen **Dictionary** to search a sign, read its instructions, hear the meaning, and practise it when camera support is available.`;
    }

    if (q.includes('camera') && (q.includes('recognize') || q.includes('support') || q.includes('supported') || q.includes('can it'))) {
      if (!sign) return 'Tell me the sign name, for example **“Can the camera recognize POLICE?”** and I’ll check the current SignBridge repository.';
      return sign.isAvailableForRecognition
        ? `✅ **${sign.displayName} is currently camera-supported.**\n\nThe active repository marks it as a live recognition class. You can practise it from **Dictionary → Practice with Camera** or use the **Live Translator**.\n\nFor better results: keep the full hand visible, use even front lighting, avoid covering one hand with the other, and hold the sign steadily for recognition.`
        : `📖 **${sign.displayName} is currently dictionary-supported, not live-camera supported.**\n\nYou can still learn its verified instructions in **Dictionary**. SignBridge intentionally does not claim camera recognition for classes that are not in the active model.`;
    }

    if (q.includes('camera') || q.includes('not recognized') || q.includes('recognition') || q.includes('lighting') || q.includes('blur')) {
      return `📹 **Camera troubleshooting**\n\n1. Keep your hands completely inside the camera frame.\n2. Use clear, even light from the front; avoid strong backlighting.\n3. Keep the camera at a comfortable distance so fingers are visible.\n4. For two-handed signs, keep both hands visible and separated when the sign requires it.\n5. Hold the sign steadily for a moment instead of changing it continuously.\n6. If the sign is outside the active model classes, SignBridge should show that it is not currently supported rather than guessing.`;
    }

    if (q.includes('assessment') || q.includes('exam') || q.includes('certificate') || q.includes('pass score')) {
      return `🏆 **Assessment & Certification**\n\nThe practical assessment asks you to perform target signs with the camera. SignBridge compares the live recognition result with the expected target and records the score.\n\nThe current assessment configuration uses an **80% passing threshold**. If you want, ask **“How does the practical assessment work?”** and I can explain the flow step by step.`;
    }

    if (q.includes('dictionary') && (q.includes('how') || q.includes('use') || q.includes('what do'))) {
      return `📖 **How to use the Dictionary**\n\n1. Search the word you want.\n2. Open the sign card.\n3. Read the **Step-by-step instructions**: hand shape → starting position → movement → ending position.\n4. Check the practice tip and common mistake.\n5. If the sign has camera support, choose **Practice with Camera**.\n\nIf verified media is not available, SignBridge will say so instead of showing a made-up sign.`;
    }

    if (q.includes('what should i do') || q.includes('where do i start') || q.includes('how do i use signbridge') || q.includes('how to use signbridge')) {
      return `🧭 **Start here**\n\n1. **Learning Hub** — learn the concept and vocabulary.\n2. **Dictionary** — search a sign and follow the simple hand-shape → start → movement → finish guide.\n3. **Practice Studio** — copy the target sign and wait for the camera feedback.\n4. **Games** — test what you learned with the 37-question quiz or Sign Match.\n5. **Assessment** — take the camera test after you are comfortable.\n\nYou do not need to guess what a button means — ask me the name of the section and I’ll explain it step by step.`;
    }

    if (q.includes('learning hub') || q.includes('learn') || q.includes('lesson')) {
      return `📚 **Learning Hub**\n\nStart with the theory chapter, learn the vocabulary, then practise with the camera where supported. The curriculum is organised from basic greetings and introductions through everyday vocabulary and situation-based conversation. Use **Games** after a lesson to reinforce recall.`;
    }

    if (q.includes('game') || q.includes('quiz') || q.includes('sign match') || q.includes('flashcard')) {
      return `🎮 **ISL Game Studio**\n\n- **Alphabet Quiz:** 37 questions, 20 seconds per question, with the correct answer shown after each response.\n- **Speed Round:** rapid alphabet recognition for 60 seconds.\n- **Flashcards:** reveal the answer after trying to remember it.\n- **Sign Match:** match each real ISL alphabet image with its letter.\n\nThe games use the bundled alphabet reference images rather than text-only placeholders.`;
    }

    if (sign) {
      const instruction = sign.hasVerifiedInstruction ? sign.instruction : null;
      const related = sign.relatedSigns?.slice(0, 4).map(id => signs.find(s => s.id === id)?.displayName || id).join(', ');
      const wantsHowTo = /how|perform|do this|make this|steps|sign this|show me/.test(q);
      const wantsMeaning = /meaning|means|what is|define|translation/.test(q);
      const parts: string[] = [`🤟 **${sign.displayName}**`, `**Meaning:** ${sign.englishMeaning}`, `**In simple words:** Look at the hand shape first, start where the guide says, do the movement slowly, then finish where the guide says.`, `**Level:** ${sign.learningLevel} · ${sign.difficulty}`, `**Hands:** ${sign.handedness === 'TWO_HANDED' ? 'Two hands' : sign.handedness === 'ONE_HANDED' ? 'One hand' : 'Either'}`];
      if (wantsHowTo || !wantsMeaning) {
        if (instruction) {
          parts.push(`\n**How to perform it**\n1. **Hand shape:** ${instruction.handConfiguration}\n2. **Start:** ${instruction.startingPosition}\n3. **Palm direction:** ${instruction.palmOrientation}\n4. **Movement:** ${instruction.movement}\n5. **Finish:** ${instruction.endingPosition}`);
        } else {
          parts.push('\n**How to perform it:** A verified movement instruction is not available for this sign yet. SignBridge will not invent one.');
        }
        if (sign.practiceTips) parts.push(`\n**Practice tip:** ${sign.practiceTips}`);
        if (sign.commonMistakes) parts.push(`**Avoid:** ${sign.commonMistakes}`);
      }
      if (sign.exampleUsage) parts.push(`\n**Example:** “${sign.exampleUsage}”`);
      parts.push(`**Camera:** ${sign.isAvailableForRecognition ? 'Currently supported' : 'Dictionary reference only'}`);
      if (related) parts.push(`**Related signs:** ${related}`);
      return parts.join('\n');
    }

    if (q.includes('what is isl') || q.includes('indian sign language') || q.includes('isl grammar')) {
      return `🇮🇳 **Indian Sign Language (ISL)** is a visual language used by Deaf communities in India. SignBridge focuses on learning and recognising verified sign vocabulary, including handshape, orientation, movement and non-manual cues where the repository provides them.\n\nAsk me about a specific sign if you want a practical step-by-step explanation.`;
    }

    return `I can help, but I want to keep the answer accurate rather than guess. Try one of these:\n\n- **“How do I perform WATER?”**\n- **“What does HELLO mean?”**\n- **“Can the camera recognize POLICE?”**\n- **“How do I use the Dictionary?”**\n- **“How does the assessment work?”**\n- **“What can I practise in Games?”**`;
  }
}
