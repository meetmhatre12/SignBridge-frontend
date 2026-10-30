/**
 * SignBridge Sentence Builder & ISL Grammar Normalizer
 *
 * Indian Sign Language (ISL) grammar differs fundamentally from English word order:
 * - Topic-Comment structure
 * - Time-initial placement (e.g., "TOMORROW DOCTOR GO")
 * - Question markers at end or beginning (e.g., "HOSPITAL WHERE")
 * - Direct demand and urgency emphasis (e.g., "WATER NEED", "POLICE HELP")
 *
 * This engine deterministically normalizes recognized ISL token sequences into natural,
 * grammatically correct English sentences with appropriate punctuation, and manages
 * multi-sentence segments.
 */

export interface SemanticIntent {
  intent: 'GREETING' | 'REQUEST' | 'INQUIRY' | 'EMERGENCY' | 'STATEMENT' | 'AFFIRMATION' | 'NEGATION';
  questionType: 'WHERE' | 'WHAT' | 'WHO' | 'WHY' | 'WHEN' | 'HOW' | 'WHICH' | 'HOW_MUCH' | 'NONE';
  subject?: string;
  action?: string;
  target?: string;
  polite: boolean;
  urgent: boolean;
  rawSigns: string[];
}

export interface SentenceTranslationResult {
  sentence: string;
  speechText: string;
  semanticIntent: SemanticIntent;
  confidence: number;
  wordCount: number;
  isQuestion: boolean;
  isEmergency: boolean;
}

export interface MultiSentenceResult {
  sentences: SentenceTranslationResult[];
  combinedText: string;
  speechText: string;
  segmentCount: number;
}

export class SentenceBuilderService {
  /**
   * Deterministic dictionary of high-frequency ISL sign combinations mapped to natural English
   */
  private static phraseLookup: Record<string, string> = {
    // 1. Single Sign Utterances
    'HELLO': 'Hello!',
    'GOOD_MORNING': 'Good morning.',
    'GOOD_AFTERNOON': 'Good afternoon.',
    'GOOD_NIGHT': 'Good night.',
    'THANK_YOU': 'Thank you.',
    'PLEASE': 'Please.',
    'SORRY': 'I am sorry.',
    'WELCOME': 'You are welcome.',
    'GOOD': 'That is good.',
    'BAD': 'That is bad.',
    'YES': 'Yes.',
    'NO': 'No.',
    'WATER': 'Water, please.',
    'FOOD': 'Food, please.',
    'EAT': 'I want to eat.',
    'DRINK': 'I want to drink.',
    'SLEEP': 'I want to sleep.',
    'WAKE': 'Time to wake up.',
    'BATHROOM': 'Where is the bathroom?',
    'HELP': 'Please help me!',
    'NEED': 'I need something.',
    'WANT': 'I want something.',
    'STOP': 'Please stop.',
    'WAIT': 'Please wait a moment.',
    'GO': 'You may go.',
    'COME': 'Please come here.',
    'SIT': 'Please sit down.',
    'STAND': 'Please stand up.',
    'HOME': 'Home.',
    'SCHOOL': 'School.',
    'COLLEGE': 'College.',
    'HOSPITAL': 'Hospital.',
    'POLICE': 'Police.',
    'DOCTOR': 'Doctor.',
    'WHERE': 'Where is it?',
    'WHAT': 'What is this?',
    'WHO': 'Who is that?',
    'WHY': 'Why?',
    'WHEN': 'When?',
    'HOW': 'How?',
    'EMERGENCY': 'Emergency!',
    'AMBULANCE': 'Call an ambulance!',
    'FIRE': 'Fire! Danger!',
    'PAIN': 'I am in pain.',
    'SICK': 'I am sick.',

    // 2. Greetings & Courtesy Sequences
    'HELLO_HOW_ARE_YOU': 'Hello, how are you?',
    'HELLO_HOW_YOU': 'Hello, how are you?',
    'HOW_ARE_YOU': 'How are you?',
    'HOW_YOU': 'How are you?',
    'GOOD_MORNING_HOW_ARE_YOU': 'Good morning, how are you?',
    'THANK_YOU_GOOD': 'Thank you, that is very good.',
    'YES_THANK_YOU': 'Yes, thank you.',
    'NO_THANK_YOU': 'No, thank you.',
    'YES_PLEASE': 'Yes, please.',
    'NO_BAD': 'No, that is not good.',
    'SORRY_LATE': 'I am sorry for being late.',
    'GOOD_SEE_YOU': 'Good to see you.',

    // 3. Needs & Requests (ISL Topic-Need / Need-Object Order)
    'I_NEED_WATER': 'I need water.',
    'NEED_WATER': 'I need some water, please.',
    'WATER_NEED': 'I need water.',
    'I_WANT_WATER': 'I want some water.',
    'WANT_WATER': 'I would like some water.',
    'I_NEED_FOOD': 'I need food.',
    'NEED_FOOD': 'I need some food.',
    'FOOD_NEED': 'I am hungry and need food.',
    'I_NEED_HELP': 'I need help.',
    'NEED_HELP': 'I need assistance, please.',
    'HELP_NEED': 'I need help right now.',
    'I_NEED_DOCTOR': 'I need to see a doctor.',
    'NEED_DOCTOR': 'I need a doctor urgently.',
    'DOCTOR_NEED': 'I need a doctor.',
    'I_NEED_HOSPITAL': 'I need to go to the hospital.',
    'NEED_HOSPITAL': 'I need to go to the hospital.',
    'HOSPITAL_NEED': 'I need a hospital.',
    'NEED_POLICE': 'I need the police.',
    'POLICE_NEED': 'I need the police.',
    'I_NEED_HOME': 'I need to go home.',
    'GO_HOME': 'I want to go home.',
    'COME_HOME': 'Please come home.',
    'GO_SCHOOL': 'Going to school.',
    'GO_HOSPITAL': 'Going to the hospital.',
    'STOP_WAIT': 'Please stop and wait.',
    'WAIT_MINUTE': 'Please wait a minute.',
    'PLEASE_HELP': 'Please help me.',
    'PLEASE_COME': 'Please come here.',
    'PLEASE_WAIT': 'Please wait.',
    'PLEASE_GIVE_WATER': 'Please give me water.',
    'GIVE_WATER': 'Please give me water.',
    'GIVE_FOOD': 'Please give me food.',

    // 4. Inquiries & Question Sequences (ISL Object-Question / Question-Object Order)
    'WHERE_HOSPITAL': 'Where is the hospital?',
    'HOSPITAL_WHERE': 'Where is the nearest hospital?',
    'WHERE_DOCTOR': 'Where is the doctor?',
    'DOCTOR_WHERE': 'Where can I find a doctor?',
    'WHERE_POLICE': 'Where is the police station?',
    'POLICE_WHERE': 'Where is the nearest police station?',
    'WHERE_BATHROOM': 'Where is the bathroom?',
    'BATHROOM_WHERE': 'Where is the washroom?',
    'WHERE_SCHOOL': 'Where is the school?',
    'SCHOOL_WHERE': 'Where is the school?',
    'WHERE_HOME': 'Where is the home located?',
    'HOME_WHERE': 'Where is the house?',
    'WHERE_STATION': 'Where is the railway station?',
    'STATION_WHERE': 'Where is the station?',
    'WHERE_WATER': 'Where can I get drinking water?',
    'WATER_WHERE': 'Where is drinking water available?',
    'WHAT_YOUR_NAME': 'What is your name?',
    'WHAT_NAME': 'What is your name?',
    'YOUR_NAME_WHAT': 'What is your name?',
    'WHO_THAT': 'Who is that person?',
    'WHO_YOU': 'Who are you?',
    'WHY_LATE': 'Why are you late?',
    'HOW_MUCH_PRICE': 'How much does this cost?',
    'HOW_MUCH': 'How much is this?',
    'HOW_MANY_STUDENT': 'How many students are there?',
    'WHEN_GO': 'When are we going?',
    'WHEN_COME': 'When will you arrive?',

    // 5. Medical & Emergency Sequences
    'HELP_POLICE': 'Help! Please call the police immediately!',
    'POLICE_HELP': 'Help! Please call the police!',
    'HELP_HOSPITAL': 'Emergency! Please take me to a hospital!',
    'HOSPITAL_HELP': 'Medical emergency! Please call an ambulance!',
    'HELP_DOCTOR': 'Please help, I need a doctor urgently!',
    'DOCTOR_HELP': 'Emergency! Doctor needed!',
    'ACCIDENT_HELP': 'Accident! Please call emergency services!',
    'FIRE_HELP': 'Fire emergency! Please help!',
    'PAIN_HELP': 'I have severe pain, please help me!',
    'SICK_NEED_DOCTOR': 'I am sick and need to see a doctor.',
    'CHEST_PAIN': 'I have chest pain.',
    'DANGER_STOP': 'Danger! Please stop immediately!'
  };

  /**
   * Normalizes an ISL token sequence into structured semantic intent
   */
  public static parseSemanticIntent(signs: string[]): SemanticIntent {
    const upperSigns = signs.map(s => s.toUpperCase().trim().replace(/^ISL_/, '').replace(/\s+/g, '_'));
    const has = (sign: string) => upperSigns.includes(sign);

    let intent: SemanticIntent['intent'] = 'STATEMENT';
    let questionType: SemanticIntent['questionType'] = 'NONE';
    const polite = has('PLEASE') || has('THANK_YOU');
    const urgent = has('HELP') || has('EMERGENCY') || has('HOSPITAL') || has('POLICE') ||
                   has('AMBULANCE') || has('FIRE') || has('DANGER') || has('ACCIDENT') || has('PAIN');

    // Questions
    if (has('WHERE')) {
      intent = 'INQUIRY';
      questionType = 'WHERE';
    } else if (has('WHAT')) {
      intent = 'INQUIRY';
      questionType = 'WHAT';
    } else if (has('WHO')) {
      intent = 'INQUIRY';
      questionType = 'WHO';
    } else if (has('WHY')) {
      intent = 'INQUIRY';
      questionType = 'WHY';
    } else if (has('WHEN')) {
      intent = 'INQUIRY';
      questionType = 'WHEN';
    } else if (has('HOW') || has('HOW_ARE_YOU')) {
      intent = 'INQUIRY';
      questionType = 'HOW';
    } else if (has('WHICH')) {
      intent = 'INQUIRY';
      questionType = 'WHICH';
    } else if (has('HOW_MUCH')) {
      intent = 'INQUIRY';
      questionType = 'HOW_MUCH';
    } else if (urgent) {
      intent = 'EMERGENCY';
    } else if (has('HELLO') || has('GOOD_MORNING') || has('GOOD_AFTERNOON') || has('GOOD_NIGHT') || has('THANK_YOU')) {
      intent = 'GREETING';
    } else if (has('NEED') || has('WANT') || has('PLEASE') || has('GIVE')) {
      intent = 'REQUEST';
    } else if (has('YES')) {
      intent = 'AFFIRMATION';
    } else if (has('NO') || has('BAD')) {
      intent = 'NEGATION';
    }

    const entities = [
      'WATER', 'FOOD', 'HOME', 'SCHOOL', 'COLLEGE', 'HOSPITAL', 'POLICE', 'DOCTOR',
      'BATHROOM', 'OFFICE', 'MARKET', 'SHOP', 'ROAD', 'STATION', 'ROOM', 'AMBULANCE'
    ];
    const target = upperSigns.find(s => entities.includes(s));

    const actions = [
      'NEED', 'WANT', 'STOP', 'GO', 'COME', 'WAIT', 'HELP', 'EAT', 'DRINK',
      'SLEEP', 'WAKE', 'SIT', 'STAND', 'OPEN', 'CLOSE', 'WORK', 'STUDY', 'READ', 'WRITE', 'CALL'
    ];
    const action = upperSigns.find(s => actions.includes(s));

    return {
      intent,
      questionType,
      subject: has('I_ME') || has('I') ? 'I' : has('YOU') ? 'You' : has('WE') ? 'We' : 'I',
      action,
      target,
      polite,
      urgent,
      rawSigns: upperSigns
    };
  }

  /**
   * Translates a single recognized sequence into a natural English sentence
   */
  public static buildSentence(signs: string[], averageConfidence = 0.92): SentenceTranslationResult {
    if (!signs || signs.length === 0) {
      return {
        sentence: '',
        speechText: '',
        semanticIntent: {
          intent: 'STATEMENT',
          questionType: 'NONE',
          polite: false,
          urgent: false,
          rawSigns: []
        },
        confidence: 0,
        wordCount: 0,
        isQuestion: false,
        isEmergency: false
      };
    }

    const intent = this.parseSemanticIntent(signs);
    const key = intent.rawSigns.join('_');

    // 1. Direct High-Precision Lookup Match
    let sentence = this.phraseLookup[key];

    // 2. ISL Structural Normalization Rules (if no direct lookup)
    if (!sentence) {
      if (intent.questionType === 'WHERE') {
        const targetWord = intent.target ? this.formatWord(intent.target) : 'it';
        sentence = `Where is the ${targetWord.toLowerCase()}?`;
      } else if (intent.questionType === 'WHAT') {
        if (intent.rawSigns.includes('NAME') || intent.rawSigns.includes('YOUR_NAME')) {
          sentence = 'What is your name?';
        } else if (intent.target) {
          sentence = `What is the ${this.formatWord(intent.target).toLowerCase()}?`;
        } else {
          sentence = 'What is this?';
        }
      } else if (intent.questionType === 'WHO') {
        sentence = intent.target ? `Who is the ${this.formatWord(intent.target).toLowerCase()}?` : 'Who is that?';
      } else if (intent.intent === 'EMERGENCY') {
        const targetWord = intent.target ? this.formatWord(intent.target) : 'help';
        sentence = `Emergency! Please call the ${targetWord.toLowerCase()} immediately!`;
      } else if (intent.intent === 'REQUEST' && intent.target) {
        const verb = intent.action ? this.formatWord(intent.action).toLowerCase() : 'need';
        const targetWord = this.formatWord(intent.target).toLowerCase();
        sentence = `I ${verb} ${targetWord}${intent.polite ? ', please.' : '.'}`;
      } else if (intent.intent === 'GREETING' && intent.rawSigns.length > 1) {
        const formatted = intent.rawSigns.map(s => this.formatWord(s)).join(', ');
        sentence = `${formatted}!`;
      } else {
        // Deterministic grammar sequence assembly without hallucinations
        const words = intent.rawSigns.map(s => this.formatWord(s));
        sentence = words.join(' ') + '.';
      }
    }

    const isQuestion = sentence.trim().endsWith('?') || intent.questionType !== 'NONE';
    const isEmergency = sentence.includes('!') || intent.urgent;

    return {
      sentence,
      speechText: sentence,
      semanticIntent: intent,
      confidence: Math.max(0, Math.min(1, averageConfidence)),
      wordCount: sentence.split(/\s+/).filter(Boolean).length,
      isQuestion,
      isEmergency
    };
  }

  /**
   * Processes a list of sign segments (e.g. broken up by temporal pauses) into multiple distinct sentences
   */
  public static buildMultiSentence(segments: string[][], averageConfidence = 0.92): MultiSentenceResult {
    if (!segments || segments.length === 0) {
      return {
        sentences: [],
        combinedText: '',
        speechText: '',
        segmentCount: 0
      };
    }

    const sentences = segments
      .filter(seg => seg.length > 0)
      .map(seg => this.buildSentence(seg, averageConfidence));

    const combinedText = sentences.map(s => s.sentence).join(' ');
    const speechText = sentences.map(s => s.speechText).join(' ');

    return {
      sentences,
      combinedText,
      speechText,
      segmentCount: sentences.length
    };
  }

  private static formatWord(signCode: string): string {
    const raw = signCode.replace(/_/g, ' ').toLowerCase();
    // Special grammatical pronouns
    if (raw === 'i me' || raw === 'i') return 'I';
    if (raw === 'you') return 'You';
    if (raw === 'we') return 'We';
    if (raw === 'he she') return 'He/She';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
}
