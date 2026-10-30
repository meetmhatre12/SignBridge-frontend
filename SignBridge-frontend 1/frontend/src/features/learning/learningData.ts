import { Chapter, CourseLevel, Lesson } from '../../types';

export const LEARNING_COURSES: CourseLevel[] = [
  { id: 'crs_lvl_1', levelNumber: 1, title: 'ISL Foundations', description: 'Start with greetings, introductions, everyday vocabulary and the visual basics of ISL.', totalHours: 6, isPublished: true },
  { id: 'crs_lvl_2', levelNumber: 2, title: 'Everyday Communication', description: 'Build practical vocabulary, descriptions and simple grammatical patterns.', totalHours: 8, isPublished: true },
  { id: 'crs_lvl_3', levelNumber: 3, title: 'Need-Based Communication', description: 'Learn useful requests and situation-based vocabulary for daily life.', totalHours: 10, isPublished: true },
  { id: 'crs_lvl_4', levelNumber: 4, title: 'Conversation & Fluency', description: 'Combine signs into meaningful conversations and prepare for assessment.', totalHours: 12, isPublished: true },
];

const chapter = (id: string, courseId: string, orderIndex: number, title: string, description: string, theoryContent: string): Chapter => ({
  id, courseId, orderIndex, title, description, theoryContent,
});

export const LEARNING_CHAPTERS: Chapter[] = [
  chapter('ch_1_1', 'crs_lvl_1', 1, 'Let Us Greet in ISL', 'Greetings, attention and polite everyday expressions.', 'ISL is a visual-manual language. Begin by learning the meaning and context of a sign, then observe its handshape, movement, orientation and location. Greetings are the first building block for a natural exchange.'),
  chapter('ch_1_2', 'crs_lvl_1', 2, 'Introduce Yourself', 'Name, identity and simple personal introductions.', 'Practice introducing yourself one idea at a time. Learn the signs you need, then combine them into short, meaningful sequences instead of memorising isolated labels.'),
  chapter('ch_1_3', 'crs_lvl_1', 3, 'Commonly Used Words — Part I', 'High-frequency words used in daily communication.', 'Vocabulary becomes easier to remember when each sign is learned with its meaning, a visual reference, an example and a short practice activity.'),
  chapter('ch_2_1', 'crs_lvl_2', 1, 'Describing Things Around You', 'Colours, shapes, size and simple descriptions.', 'Description practice moves beyond naming an object. Learners connect a concept with visual-spatial information and practise the sequence in context.'),
  chapter('ch_2_2', 'crs_lvl_2', 2, 'Basic Grammatical Structure — Part I', 'Understand that ISL is a language with its own grammar.', 'Do not assume English word order maps directly to ISL. Learn sentence patterns from verified ISL examples and practise complete meanings rather than translating word-for-word.'),
  chapter('ch_2_3', 'crs_lvl_2', 3, 'Commonly Used Words — Part II', 'Expand everyday vocabulary and recognition speed.', 'Use spaced repetition: learn a sign, recall it without looking, practise it on camera, then revisit it later. Movement and facial/non-manual information may also be important to meaning.'),
  chapter('ch_3_1', 'crs_lvl_3', 1, 'Need-Based Vocabulary — Part I', 'Food, water, movement and common requests.', 'Need-based communication should be practised as complete intentions. Learn the sign, its usage, and a short situation in which a person would naturally use it.'),
  chapter('ch_3_2', 'crs_lvl_3', 2, 'Need-Based Vocabulary — Part II', 'Health, services, people and practical situations.', 'Practice signs in realistic contexts. For safety-related meanings, the system should require clear recognition and confirmation instead of guessing.'),
  chapter('ch_4_1', 'crs_lvl_4', 1, 'Need-Based Vocabulary — Part III', 'Advanced practical vocabulary and situation-based combinations.', 'Build fluency by combining verified signs into short sequences. The recognition pipeline should analyse temporal frames, not only one frozen hand pose.'),
  chapter('ch_4_2', 'crs_lvl_4', 2, 'Situation-Based Conversation in ISL', 'Short conversations, sentence building and fluency practice.', 'The final stage connects vocabulary, grammar, movement, facial/non-manual cues and temporal sequencing. Learners should be able to sign a short intention and review how the system segmented and interpreted it.'),
];

const lesson = (id: string, chapterId: string, orderIndex: number, title: string, description: string, theoryContent: string, signsIncluded: string[], passingScore = 80): Lesson => ({
  id, chapterId, orderIndex, title, description, theoryContent, signsIncluded, passingScore,
});

export const LEARNING_LESSONS: Lesson[] = [
  lesson('les_1_1_1', 'ch_1_1', 1, 'Greeting Basics', 'Learn the meaning and context of common greetings.', 'Study the reference media first. Identify the handshape and movement, then reproduce the sign naturally. Do not force the camera to wait for a perfectly frozen hand.', ['HELLO', 'THANK_YOU', 'PLEASE']),
  lesson('les_1_1_2', 'ch_1_1', 2, 'Polite Responses', 'Practise short greeting and courtesy sequences.', 'Combine two or three verified signs into a short exchange. Pause naturally between signs so the temporal recognizer can segment the sequence.', ['SORRY', 'GOOD', 'YES', 'NO']),
  lesson('les_1_2_1', 'ch_1_2', 1, 'My Introduction', 'Build a simple personal introduction.', 'Learn the vocabulary first, then practise the complete sequence. The goal is meaning-level communication, not word-for-word English translation.', ['I', 'NAME', 'MY', 'FAMILY']),
  lesson('les_1_3_1', 'ch_1_3', 1, 'Everyday Starter Vocabulary', 'Learn high-frequency daily words.', 'Use flashcards, recall, camera practice and spaced repetition. Each item should eventually be backed by verified ISL media supplied for the project.', ['WATER', 'FOOD', 'EAT', 'DRINK', 'NEED']),
  lesson('les_2_1_1', 'ch_2_1', 1, 'Visual Descriptions', 'Practise colour, size and simple object descriptions.', 'Descriptions depend on context. Use the verified sign media and example sentence for each concept rather than inventing a gesture.', ['BIG', 'SMALL', 'RED', 'BLUE', 'GOOD']),
  lesson('les_2_2_1', 'ch_2_2', 1, 'ISL Grammar Patterns', 'Understand sentence structure through examples.', 'Study complete ISL examples. Compare the intended meaning with the English gloss, while remembering that a gloss is not a full representation of ISL grammar.', ['WHAT', 'WHO', 'WHERE', 'WHY', 'HOW']),
  lesson('les_2_3_1', 'ch_2_3', 1, 'Vocabulary Recall', 'Increase recognition speed without sacrificing accuracy.', 'First practise slowly. Once accuracy is stable, use the Speed Round. Incorrect items should return to Flashcards instead of being repeatedly guessed.', ['HOME', 'SCHOOL', 'FRIEND', 'FAMILY', 'WORK']),
  lesson('les_3_1_1', 'ch_3_1', 1, 'Everyday Needs', 'Turn vocabulary into practical requests.', 'Practise the sign sequence for a real situation. The temporal recognizer should accept a sign from a moving gesture when its learned sequence evidence is strong enough.', ['WATER', 'FOOD', 'GO', 'COME', 'WAIT']),
  lesson('les_3_2_1', 'ch_3_2', 1, 'Health & Services', 'Communicate common health and service needs.', 'Use high-confidence recognition and explicit confirmation for critical meanings. Do not treat a low-confidence camera guess as a real emergency.', ['HOSPITAL', 'DOCTOR', 'POLICE', 'HELP', 'PAIN']),
  lesson('les_4_1_1', 'ch_4_1', 1, 'Advanced Practical Vocabulary', 'Combine known signs into useful multi-sign intentions.', 'Review the sequence on screen after each practice attempt. Learn which signs were accepted, where segmentation occurred, and which signs need another practice pass.', ['HELP', 'WHERE', 'HOSPITAL', 'NEED', 'WATER'], 85),
  lesson('les_4_2_1', 'ch_4_2', 1, 'Situation-Based Conversation', 'Build and practise short ISL sentences.', 'Sign naturally. The system should analyse a stream of landmarks over time, recognise stable sign evidence while the hand moves, suppress accidental duplicates, and segment the sentence using pauses or neutral transitions.', ['HELLO', 'I', 'NEED', 'HELP', 'WHERE'], 85),
];

export function getFallbackChapters(courseId: string): Chapter[] {
  return LEARNING_CHAPTERS.filter(c => c.courseId === courseId).map(c => ({
    ...c,
    lessons: LEARNING_LESSONS.filter(l => l.chapterId === c.id),
  }));
}
