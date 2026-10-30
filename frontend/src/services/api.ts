import {
  UserProfile,
  SignItem,
  CourseLevel,
  Chapter,
  Lesson,
  Assessment,
  Certificate,
  SavedPhrase,
  UserCorrection,
  DatasetSample,
  ModelVersionInfo,
  Organization,
  Classroom,
  InstitutionalReport,
  DatasetContribution,
  ApiKey,
  WebhookSubscription
} from '../types';

const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
// In local development call the backend directly so registration/login do not depend
// on a Vite proxy process. Production keeps the normal same-origin /api path.
const API_BASE = configuredApiBase || (isLocalHost ? 'http://localhost:3001/api' : '/api');

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('signbridge_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  /**
   * Centralized Safe HTTP Fetcher & Response Parser
   * Eliminates "Unexpected end of JSON input" errors by inspecting HTTP status,
   * Content-Type, empty bodies, and server error HTML pages.
   */
  private async safeFetch<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const mergedOptions: RequestInit = {
        ...options,
        signal: options.signal || controller.signal,
        headers: { 'Content-Type': 'application/json', ...this.getHeaders(), ...(options.headers || {}) }
      };
      const res = await fetch(url, mergedOptions);
      const contentType = res.headers.get('content-type') || '';
      const bodyText = await res.text();
      let parsed: any = null;
      if (bodyText.trim() && contentType.includes('application/json')) {
        try { parsed = JSON.parse(bodyText); } catch { parsed = null; }
      }

      if (res.status === 401) {
        localStorage.removeItem('signbridge_token');
        return { success: false, error: parsed?.message || parsed?.error || 'Your session has expired or is invalid. Please sign in again.' };
      }
      if (res.status === 403) return { success: false, error: parsed?.message || parsed?.error || 'Access denied for this account.' };
      if (res.status === 404) return { success: false, error: parsed?.message || parsed?.error || 'The requested resource was not found.' };
      if (!res.ok) {
        const serverMessage = parsed?.message || parsed?.error;
        const rawMessage = bodyText.trim().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return {
          success: false,
          error: serverMessage || rawMessage.slice(0, 220) || `Server request failed with status ${res.status}.`,
          message: `HTTP ${res.status}`
        };
      }
      if (parsed !== null) {
        return {
          success: parsed.success !== undefined ? parsed.success : true,
          data: parsed.data !== undefined ? parsed.data : parsed,
          error: parsed.error,
          message: parsed.message
        };
      }
      return { success: true, data: (bodyText || undefined) as T };
    } catch (error: any) {
      console.warn('SignBridge network request error:', error);
      return {
        success: false,
        error: error?.name === 'AbortError'
          ? 'SignBridge server timed out. Please check that the backend is running.'
          : 'Unable to connect to SignBridge server. Please check that the backend is running.'
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // 1. Auth & Profile
  async register(data: { email: string; password: string; fullName: string; phone?: string }): Promise<ApiResponse<{ token?: string; user?: UserProfile; verificationRequired?: boolean; email?: string }>> {
    return this.safeFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async verifyEmail(email: string, otp: string): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    return this.safeFetch(`${API_BASE}/auth/verify-email`, { method: 'POST', body: JSON.stringify({ email, otp }) });
  }

  async resendVerification(email: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/auth/resend-verification`, { method: 'POST', body: JSON.stringify({ email }) });
  }

  async login(data: { email: string; password: string }): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    return this.safeFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  async supabaseOAuthLogin(code: string, codeVerifier: string): Promise<ApiResponse<{ token: string; user: UserProfile; supabaseAccessToken?: string }>> {
    return this.safeFetch(`${API_BASE}/auth/supabase`, {
      method: 'POST',
      body: JSON.stringify({ code, codeVerifier })
    });
  }

  async setPassword(newPassword: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.safeFetch(`${API_BASE}/auth/me`);
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.safeFetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/auth/password`, { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
  }

  async clearHistory(): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/auth/history`, {
      method: 'DELETE'
    });
  }

  // 2. Real-Time Recognition Inference
  async predictSign(hands: any[]): Promise<ApiResponse<{
    prediction: {
      label: string | null;
      name: string | null;
      confidence: number;
      rawScore: number;
      stable: boolean;
      status: string;
      message: string;
    } | null;
    topPredictions?: Array<{ sign: string; name: string; confidence: number }>;
  }>> {
    return this.safeFetch(`${API_BASE}/recognition/predict`, {
      method: 'POST',
      body: JSON.stringify({ hands, handCount: hands.length })
    });
  }

  // 3. ISL Signs Dictionary
  async getSigns(params?: {
    category?: string;
    difficulty?: string;
    learningLevel?: number;
    handedness?: string;
    isTwoHanded?: boolean;
    isEmergency?: boolean;
    isAvailableForRecognition?: boolean;
    query?: string;
  }): Promise<ApiResponse<SignItem[]>> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.learningLevel) query.set('learningLevel', String(params.learningLevel));
    if (params?.handedness) query.set('handedness', params.handedness);
    if (params?.isTwoHanded !== undefined) query.set('isTwoHanded', String(params.isTwoHanded));
    if (params?.isEmergency !== undefined) query.set('isEmergency', String(params.isEmergency));
    if (params?.isAvailableForRecognition !== undefined) query.set('isAvailableForRecognition', String(params.isAvailableForRecognition));
    if (params?.query) query.set('q', params.query);

    return this.safeFetch(`${API_BASE}/signs?${query.toString()}`);
  }

  async getSignStats(): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/signs/stats`);
  }

  async getSignById(id: string): Promise<ApiResponse<SignItem>> {
    return this.safeFetch(`${API_BASE}/signs/${id}`);
  }

  // 3. Translator & Human Correction Queue
  async translateSequence(signs: string[], confidence: number): Promise<ApiResponse<{
    id: string;
    sentence: string;
    speechText: string;
    signs: string[];
    confidence: number;
    isAccepted: boolean;
  }>> {
    return this.safeFetch(`${API_BASE}/translator/sequence`, {
      method: 'POST',
      body: JSON.stringify({ signs, confidence })
    });
  }

  async submitCorrection(data: {
    translationResultId?: string;
    recognizedSigns: string[];
    suggestedMeaning: string;
    confidenceAtPrediction: number;
    feedbackNotes?: string;
  }): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.safeFetch(`${API_BASE}/translator/correct`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 5. Two-Way Conversation & Saved Phrases
  async getSavedPhrases(): Promise<ApiResponse<SavedPhrase[]>> {
    return this.safeFetch(`${API_BASE}/conversation/phrases`);
  }

  async addSavedPhrase(phrase: string, category: string = 'General'): Promise<ApiResponse<SavedPhrase>> {
    return this.safeFetch(`${API_BASE}/conversation/phrases`, {
      method: 'POST',
      body: JSON.stringify({ phrase, category })
    });
  }

  async deleteSavedPhrase(phraseId: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/conversation/phrases/${phraseId}`, {
      method: 'DELETE'
    });
  }

  // 6. Structured Curriculum & Lessons
  async getCourses(): Promise<ApiResponse<CourseLevel[]>> {
    return this.safeFetch(`${API_BASE}/learning/courses`);
  }

  async getChapters(courseId?: string): Promise<ApiResponse<Chapter[]>> {
    const q = courseId ? `?courseId=${courseId}` : '';
    return this.safeFetch(`${API_BASE}/learning/chapters${q}`);
  }

  async getLesson(lessonId: string): Promise<ApiResponse<Lesson>> {
    return this.safeFetch(`${API_BASE}/learning/lessons/${lessonId}`);
  }

  async completeLesson(lessonId: string, accuracyScore: number): Promise<ApiResponse<{ completed: boolean; pointsEarned: number }>> {
    return this.safeFetch(`${API_BASE}/learning/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ score: accuracyScore })
    });
  }

  async getRecommendations(): Promise<ApiResponse<{
    recommendedLessons: Lesson[];
    completedCount?: number;
    totalLessons?: number;
    message?: string;
  }>> {
    return this.safeFetch(`${API_BASE}/learning/recommendations`);
  }

  // Personal progress (private)
  async getMyProgress(): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/progress/me`);
  }

  async recordPracticeAttempt(payload: { signId: string; confidence: number; passed: boolean }): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/practice/attempts`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // 7. Practical Camera Assessment & Certifications
  async getAssessments(): Promise<ApiResponse<Assessment[]>> {
    return this.safeFetch(`${API_BASE}/assessments`);
  }

  async getAssessment(id: string): Promise<ApiResponse<Assessment>> {
    return this.safeFetch(`${API_BASE}/assessments/${id}`);
  }

  async getAssessmentById(id: string): Promise<ApiResponse<Assessment>> {
    return this.safeFetch(`${API_BASE}/assessments/${id}`);
  }

  async evaluateAssessment(assessmentId: string, performedSigns: Record<string, number>): Promise<ApiResponse<{
    score: number;
    passingScore: number;
    isPassed: boolean;
    certificate: Certificate | null;
    message: string;
  }>> {
    return this.safeFetch(`${API_BASE}/assessments/${assessmentId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ performedSigns })
    });
  }

  async evaluateAssessmentAttempt(assessmentId: string, payload: {
    questionResults: Array<{ signId: string; confidence: number; isAccepted: boolean }>;
    totalDurationSeconds: number;
  }): Promise<ApiResponse<{
    passed: boolean;
    finalScore: number;
    certificateId?: string;
    certificate?: Certificate;
    feedback: string;
  }>> {
    const performedMap: Record<string, number> = {};
    payload.questionResults.forEach(q => {
      performedMap[q.signId] = Math.round(q.confidence * 100);
    });
    return this.safeFetch(`${API_BASE}/assessments/${assessmentId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ performedSigns: performedMap })
    });
  }

  async getMyCertificates(): Promise<ApiResponse<Certificate[]>> {
    return this.safeFetch(`${API_BASE}/certificates/my`);
  }

  async verifyCertificate(certificateId: string): Promise<ApiResponse<{
    isValid: boolean;
    certificate?: Certificate;
    recipientName?: string;
    status?: string;
    message?: string;
  }>> {
    return this.safeFetch(`${API_BASE}/certificates/verify/${certificateId}`);
  }


  // 8. Admin Studio Management
  async getAdminStats(): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/admin/stats`);
  }

  async createSign(signData: Partial<SignItem>): Promise<ApiResponse<SignItem>> {
    return this.safeFetch(`${API_BASE}/admin/signs`, {
      method: 'POST',
      body: JSON.stringify(signData)
    });
  }

  async updateSign(signId: string, signData: Partial<SignItem>): Promise<ApiResponse<SignItem>> {
    return this.safeFetch(`${API_BASE}/admin/signs/${signId}`, {
      method: 'PUT',
      body: JSON.stringify(signData)
    });
  }

  async deleteSign(signId: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/admin/signs/${signId}`, {
      method: 'DELETE'
    });
  }

  async createLesson(lessonData: Partial<Lesson>): Promise<ApiResponse<Lesson>> {
    return this.safeFetch(`${API_BASE}/admin/lessons`, {
      method: 'POST',
      body: JSON.stringify(lessonData)
    });
  }

  async getReviewQueue(): Promise<ApiResponse<UserCorrection[]>> {
    return this.safeFetch(`${API_BASE}/admin/corrections`);
  }

  async updateCorrectionStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW', notes?: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/admin/corrections/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  }

  async getDatasetSamples(): Promise<ApiResponse<{ samples: DatasetSample[]; splitsSummary: Record<string, number> }>> {
    return this.safeFetch(`${API_BASE}/admin/dataset`);
  }

  async getModelVersions(): Promise<ApiResponse<ModelVersionInfo[]>> {
    return this.safeFetch(`${API_BASE}/admin/models`);
  }

  async getAdminUsers(query = ''): Promise<ApiResponse<any[]>> {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.safeFetch(`${API_BASE}/admin/users${suffix}`);
  }

  async getAdminUserDetail(userId: string): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}`);
  }

  async getAdminCertificates(): Promise<ApiResponse<any[]>> {
    return this.safeFetch(`${API_BASE}/admin/certificates`);
  }

  async getAdminAuditLogs(): Promise<ApiResponse<any[]>> {
    return this.safeFetch(`${API_BASE}/admin/audit-logs`);
  }

  // --- Dataset Contributions & Informed Consent ---
  async submitContribution(data: {
    signId: string;
    canonicalName?: string;
    handCount?: number;
    landmarks: any[];
    regionalVariant?: string;
    consentGiven: boolean;
  }): Promise<ApiResponse<DatasetContribution>> {
    return this.safeFetch(`${API_BASE}/contributions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getContributions(status?: string): Promise<ApiResponse<DatasetContribution[]>> {
    const url = status ? `${API_BASE}/contributions?status=${encodeURIComponent(status)}` : `${API_BASE}/contributions`;
    return this.safeFetch(url);
  }

  async reviewContribution(
    contributionId: string,
    status: 'APPROVED' | 'REJECTED',
    reviewNotes?: string,
    split?: 'TRAIN' | 'VALIDATION' | 'TEST'
  ): Promise<ApiResponse<DatasetContribution>> {
    return this.safeFetch(`${API_BASE}/contributions/${contributionId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, reviewNotes, split })
    });
  }

  // --- Enterprise Institution & School Management ---
  async getMyOrganization(): Promise<ApiResponse<{
    organization: Organization;
    classroomsCount: number;
    teachersCount: number;
    learnersCount: number;
  }>> {
    return this.safeFetch(`${API_BASE}/institution/me`);
  }

  async createOrganization(name: string, code: string): Promise<ApiResponse<Organization>> {
    return this.safeFetch(`${API_BASE}/institution`, {
      method: 'POST',
      body: JSON.stringify({ name, code })
    });
  }

  async getClassrooms(): Promise<ApiResponse<Classroom[]>> {
    return this.safeFetch(`${API_BASE}/institution/classrooms`);
  }

  async createClassroom(data: {
    name: string;
    gradeOrBatch?: string;
    teacherUserId?: string;
    courseIds?: string[];
  }): Promise<ApiResponse<Classroom>> {
    return this.safeFetch(`${API_BASE}/institution/classrooms`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async enrollLearner(classroomId: string, email: string, role?: 'learner' | 'teacher'): Promise<ApiResponse<{ classroom: Classroom }>> {
    return this.safeFetch(`${API_BASE}/institution/classrooms/${classroomId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ email, role })
    });
  }

  async getInstitutionalReport(): Promise<ApiResponse<{
    report: InstitutionalReport;
    organization: Organization;
    classrooms: Array<Classroom & { enrolledCount: number }>;
  }>> {
    return this.safeFetch(`${API_BASE}/institution/reports`);
  }

  // --- Developer Platform & API Keys ---
  async createApiKey(data: {
    name?: string;
    rateLimitPerMin?: number;
    scopes?: string[];
  }): Promise<ApiResponse<ApiKey & { secretKey: string }>> {
    return this.safeFetch(`${API_BASE}/developer/keys`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listApiKeys(): Promise<ApiResponse<ApiKey[]>> {
    return this.safeFetch(`${API_BASE}/developer/keys`);
  }

  async revokeApiKey(keyId: string): Promise<ApiResponse<void>> {
    return this.safeFetch(`${API_BASE}/developer/keys/${keyId}`, {
      method: 'DELETE'
    });
  }

  async registerWebhook(data: {
    targetUrl: string;
    events?: string[];
  }): Promise<ApiResponse<WebhookSubscription>> {
    return this.safeFetch(`${API_BASE}/developer/webhooks`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getOpenApiSchema(): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/developer/openapi.json`);
  }

  // --- Versioned B2B API v1 direct client execution ---
  async v1GetSigns(): Promise<ApiResponse<any[]>> {
    return this.safeFetch(`${API_BASE}/v1/isl/signs`);
  }

  async v1PredictSign(landmarks: any[], apiKey: string): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/v1/isl/predict`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: JSON.stringify({ landmarks })
    });
  }

  async v1TranslateSequence(signSequence: string[], apiKey: string): Promise<ApiResponse<any>> {
    return this.safeFetch(`${API_BASE}/v1/isl/translate`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: JSON.stringify({ signSequence })
    });
  }

}

export const api = new ApiService();
