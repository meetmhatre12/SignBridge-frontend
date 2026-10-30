import { SignRepository } from '../../../../ml/sign_repository';

export interface GameSign {
  id: string;
  signId: string;
  label: string;
  answer: string;
  kind: 'alphabet' | 'word' | 'phrase';
  image: string;
  video?: string;
  meaning?: string;
  example?: string;
  hint?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export const ALPHABET_SIGNS: GameSign[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({
  id: `alphabet-${letter.toLowerCase()}`,
  signId: `isl_${letter.toLowerCase()}`,
  label: letter,
  answer: letter,
  kind: 'alphabet',
  image: `/signs/alphabets/${letter.toLowerCase()}.jpg`,
  meaning: `ISL Manual Alphabet Letter ${letter}`,
  example: `Spell words beginning with ${letter}`,
  hint: `Hand shape for letter ${letter}`,
  difficulty: 'beginner',
}));

export const WORD_SIGNS: GameSign[] = SignRepository.getAllSigns()
  .filter(s => s.category !== 'ALPHABET' && s.verified)
  .slice(0, 30)
  .map(s => ({
    id: s.signId || s.id,
    signId: s.signId || ('isl_' + s.id.toLowerCase()),
    label: s.displayName,
    answer: s.displayName,
    kind: 'word' as const,
    image: s.image || '',
    video: s.video,
    meaning: s.englishMeaning,
    example: s.exampleSentence || s.exampleUsage,
    hint: s.instruction.handConfiguration,
    difficulty: (s.difficulty === 'EASY' ? 'beginner' : (s.difficulty === 'MEDIUM' ? 'intermediate' : 'advanced')) as any
  }));

export const ALL_GAME_SIGNS: GameSign[] = [...ALPHABET_SIGNS, ...WORD_SIGNS];
