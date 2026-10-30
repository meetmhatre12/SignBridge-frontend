/**
 * SignBridge NLP Engine: Universal Semantic Framing & Natural English Generator
 * Converts raw ISL sign sequences into clean, natural, grammatically correct English sentences.
 */

import { SentenceBuilderService, SemanticIntent, SentenceTranslationResult } from './sentence_builder.js';

export interface UniversalSemanticFrame {
  intent: 'GREETING' | 'REQUEST' | 'INQUIRY' | 'EMERGENCY' | 'STATEMENT' | 'AFFIRMATION' | 'NEGATION';
  subject?: string;
  action?: string;
  target?: string;
  questionType?: 'WHERE' | 'WHAT' | 'WHO' | 'WHY' | 'WHEN' | 'HOW' | 'WHICH' | 'HOW_MUCH' | 'NONE';
  politeness: boolean;
  urgent: boolean;
  rawSigns: string[];
}

export interface GeneratedSentenceResult {
  sentence: string;
  semanticFrame: UniversalSemanticFrame;
  confidenceScore: number;
  wordCount: number;
  speechText: string;
}

export class ISLtoEnglishNLPEngine {
  /**
   * Parses raw ISL signs into a Universal Semantic Representation
   */
  public static parseSemanticFrame(signs: string[]): UniversalSemanticFrame {
    const intent: SemanticIntent = SentenceBuilderService.parseSemanticIntent(signs);
    return {
      intent: intent.intent,
      subject: intent.subject,
      action: intent.action,
      target: intent.target,
      questionType: intent.questionType,
      politeness: intent.polite,
      urgent: intent.urgent,
      rawSigns: intent.rawSigns
    };
  }

  /**
   * Generates natural English sentence from sign sequence
   */
  public static generateSentence(signs: string[], averageConfidence = 0.92): GeneratedSentenceResult {
    const result: SentenceTranslationResult = SentenceBuilderService.buildSentence(signs, averageConfidence);
    return {
      sentence: result.sentence,
      speechText: result.speechText,
      semanticFrame: {
        intent: result.semanticIntent.intent,
        subject: result.semanticIntent.subject,
        action: result.semanticIntent.action,
        target: result.semanticIntent.target,
        questionType: result.semanticIntent.questionType,
        politeness: result.semanticIntent.polite,
        urgent: result.semanticIntent.urgent,
        rawSigns: result.semanticIntent.rawSigns
      },
      confidenceScore: result.confidence,
      wordCount: result.wordCount
    };
  }
}
