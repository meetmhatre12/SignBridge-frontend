export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  age?: number;
  gender?: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  phone?: string;
  phoneVerified?: boolean;
  googleId?: string;
  avatar?: string;
  emailVerified?: boolean;
  authProvider?: 'local' | 'google';
  hasPassword?: boolean;
  role: 'learner' | 'teacher' | 'admin' | 'organization_admin';
  plan: 'FREE' | 'PREMIUM' | 'INSTITUTION';
  organizationId?: string;
  preferredSpokenLanguage: string;
  preferredTranscriptionLanguage: string;
  learningPoints?: number;
  completedLessons?: string[];
  enrolledCourses?: string[];
  favoriteSigns?: string[];
  cameraSettings: {
    mirrorCamera: boolean;
    highContrastGuides: boolean;
    showLandmarkOverlay: boolean;
    enableHapticFeedback: boolean;
  };
  privacySettings: {
    allowHistoryStorage: boolean;
    allowModelImprovement: boolean;
  };
  createdAt: string;
}

export interface SignCategory {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
}

export interface SignInstruction {
  handConfiguration: string;
  palmOrientation: string;
  movement: string;
  startingPosition: string;
  endingPosition: string;
}

export interface SignItem {
  id: string;
  signId?: string;
  canonicalName: string;
  gloss?: string;
  displayName: string;
  englishMeaning: string;
  category: string;
  subcategory?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  learningLevel: 1 | 2 | 3 | 4;
  handedness: 'ONE_HANDED' | 'TWO_HANDED' | 'EITHER';
  instruction: SignInstruction;
  hasVerifiedInstruction: boolean;
  commonMistakes: string;
  practiceTips: string;
  exampleUsage: string;
  emergency: boolean;
  isAvailableForRecognition: boolean;
  isAvailableForAssessment: boolean;
  recognitionClass: string | null;
  aliases: string[];
  relatedSigns: string[];

  // Media & Dataset properties
  image?: string;
  video?: string;
  datasetSources?: string[];
  aiSupported?: boolean;
  staticOrDynamic?: 'STATIC' | 'DYNAMIC';
  verified?: boolean;

  // Legacy/Compatibility accessors
  name?: string;
  categoryId?: string;
  meaning?: string;
  englishTranslation?: string;
  isTwoHanded?: boolean;
  isEmergency?: boolean;
  isSupportedInV1?: boolean;
  description?: string;
  instructions?: string;
  exampleSentence?: string;
  mediaUrl?: string;
}

export interface CourseLevel {
  id: string;
  levelNumber: number;
  title: string;
  description: string;
  totalHours: number;
  isPublished: boolean;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  description: string;
  theoryContent?: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  orderIndex: number;
  description: string;
  theoryContent?: string;
  signsIncluded: string[];
  passingScore: number;
  signs?: SignItem[];
  isCompleted?: boolean;
  bestAccuracy?: number | null;
}

export interface Assessment {
  id: string;
  title: string;
  levelNumber: number;
  description: string;
  targetSigns: string[];
  passingScore: number;
  durationMinutes: number;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  userId: string;
  userName: string;
  courseTitle: string;
  levelNumber: number;
  score: number;
  issueDate: string;
  qrCodeDataUrl?: string;
  tamperHash?: string;
  verificationUrl?: string;
  status: 'VALID' | 'REVOKED' | 'SUSPENDED';
}

export interface SavedPhrase {
  id: string;
  userId: string;
  phrase: string;
  category: string;
  signSequence?: string[];
  createdAt: string;
}

export interface TranslationResult {
  id: string;
  userId?: string;
  signSequence: string[];
  predictedSentence: string;
  confidenceScore: number;
  modelVersion: string;
  isAccepted: boolean;
  timestamp: string;
}

export interface UserCorrection {
  id: string;
  userId?: string;
  translationResultId?: string;
  recognizedSigns: string[];
  suggestedMeaning: string;
  confidenceAtPrediction: number;
  modelVersion: string;
  feedbackNotes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DatasetSample {
  id: string;
  signId: string;
  signName: string;
  handCount: number;
  split: 'TRAIN' | 'VALIDATION' | 'TEST';
  source: 'ADMIN_CURATED' | 'USER_CORRECTION_APPROVED' | 'SYNTHETIC';
  qualityScore: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

export interface ModelVersionInfo {
  version: string;
  releaseDate: string;
  status: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'RETIRED';
  datasetVersion: string;
  supportedSignsCount: number;
  evalMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    latencyMs: number;
    lowConfidenceRate: number;
  } | null;
  releaseNotes: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  adminUserId: string;
  plan: 'FREE' | 'PREMIUM' | 'INSTITUTION';
  memberCount: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface Classroom {
  id: string;
  organizationId: string;
  name: string;
  gradeOrBatch?: string;
  teacherUserId: string;
  studentUserIds: string[];
  courseIds: string[];
  createdAt: string;
  enrolledCount?: number;
}

export interface InstitutionalReport {
  organizationId: string;
  totalStudents: number;
  totalTeachers: number;
  classroomsCount: number;
  averageCompletionRate: number;
  assessmentPassRate: number;
  generatedAt: string;
}

export interface DatasetContribution {
  id: string;
  contributorId: string;
  contributorName: string;
  contributorRole: string;
  signId: string;
  canonicalName: string;
  handCount: number;
  landmarks: any[];
  split: 'TRAIN' | 'VALIDATION' | 'TEST';
  regionalVariant?: string;
  consentGiven: boolean;
  consentTimestamp: string;
  duplicateOf?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerMin: number;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  lastUsedAt?: string;
  secretKey?: string;
}

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  targetUrl: string;
  secret: string;
  events: string[];
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
}

