/**
 * Learning metadata for the supplied A-Z reference image set.
 * The dataset provides static reference photos, not verified written movement mechanics.
 * Therefore this file intentionally describes how to study the image without inventing
 * physical movements that are not present in the source data.
 */
export interface AlphabetGuidance {
  letter: string;
  hands: 'One hand' | 'Two hands';
  image: string;
  study: string;
}

const TWO_HANDS = new Set(['A','B','D','E','F','G','H','J','K','M','N','P','Q','R','T','W','X','Y','Z']);

export const ALPHABET_GUIDANCE: Record<string, AlphabetGuidance> = Object.fromEntries(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => [letter, {
    letter,
    hands: TWO_HANDS.has(letter) ? 'Two hands' : 'One hand',
    image: `/signs/alphabets/${letter.toLowerCase()}.jpg`,
    study: `Use the supplied ${letter} reference image as the exact pose. Check the number of hands, each finger position, thumb position and palm orientation. Hold the static pose clearly; do not invent a movement.`
  }])
);

export const getAlphabetGuidance = (letter: string) => ALPHABET_GUIDANCE[String(letter || '').toUpperCase()] || null;
