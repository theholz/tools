/**
 * Bug Reporter - Reports API failures to Enhancement Board
 */

import { Logger } from './logger.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface EnhancementCard {
  id: string;
  title: string;
  description: string;
  limitation: string;
  recommendations: string[];
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    completed: boolean;
  }>;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'in_development' | 'done' | 'blocked';
  source: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get path to enhancements.json file
 */
function getEnhancementsFilePath(): string {
  // Try to find the enhancements.json file in the copilokit project
  const possiblePaths = [
    join(process.cwd(), '..', '..', 'copilokit', 'app', 'frontend', 'public', 'enhancements.json'),
    join(process.env.HOME || '/tmp', 'projects', 'copilokit', 'app', 'frontend', 'public', 'enhancements.json'),
    '/media/tait/Docker/projects/copilokit/app/frontend/public/enhancements.json',
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Return the most likely path (create if needed)
  return possiblePaths[2]; // Default to absolute path
}

/**
 * Load existing enhancement cards
 */
function loadEnhancements(): EnhancementCard[] {
  const filePath = getEnhancementsFilePath();
  
  try {
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    // File doesn't exist or invalid JSON - return empty array
  }

  return [];
}

/**
 * Save enhancement cards
 */
function saveEnhancements(cards: EnhancementCard[]): void {
  const filePath = getEnhancementsFilePath();
  const dir = join(filePath, '..');
  
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(cards, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save enhancements: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if a bug report already exists for this issue
 */
function findExistingBug(title: string, errorMessage: string): EnhancementCard | null {
  const cards = loadEnhancements();
  
  // Look for bugs with similar title or error message
  return cards.find(card => {
    const isBug = card.tags.some(tag => tag.toLowerCase().includes('bug'));
    const similarTitle = card.title.toLowerCase().includes(title.toLowerCase().substring(0, 20));
    const similarError = card.limitation?.toLowerCase().includes(errorMessage.toLowerCase().substring(0, 30));
    
    return isBug && (similarTitle || similarError) && card.status !== 'done';
  }) || null;
}

/**
 * Report a bug to the Enhancement Board
 */
export async function reportBug(
  title: string,
  errorMessage: string,
  context: Record<string, any> = {},
  logger: Logger
): Promise<string | null> {
  try {
    // Check if bug already exists
    const existing = findExistingBug(title, errorMessage);
    if (existing) {
      logger.info('Bug report already exists', { cardId: existing.id, title: existing.title });
      
      // Update the existing card with latest error
      existing.updatedAt = new Date().toISOString();
      existing.limitation = `${existing.limitation}\n\n[${new Date().toISOString()}] Latest occurrence: ${errorMessage}`;
      
      const cards = loadEnhancements();
      const index = cards.findIndex(c => c.id === existing.id);
      if (index >= 0) {
        cards[index] = existing;
        saveEnhancements(cards);
      }
      
      return existing.id;
    }

    // Create new bug report
    const cardId = `enh-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const recommendations = [
      'Check API logs for detailed error information',
      'Verify TradingView API is accessible',
      'Check browser connection status',
      'Review system resources (memory, CPU)',
      'Verify Chrome/Playwright is properly installed'
    ];

    const acceptanceCriteria = [
      {
        id: `${cardId}-ac-1`,
        description: 'API health check passes consistently',
        completed: false
      },
      {
        id: `${cardId}-ac-2`,
        description: 'Browser connection is stable',
        completed: false
      },
      {
        id: `${cardId}-ac-3`,
        description: 'Error is resolved and documented',
        completed: false
      },
      {
        id: `${cardId}-ac-4`,
        description: 'Feature is tested and verified working',
        completed: false
      }
    ];

    const contextStr = Object.keys(context).length > 0
      ? `\n\n**Context:**\n${JSON.stringify(context, null, 2)}`
      : '';

    const newCard: EnhancementCard = {
      id: cardId,
      title: title,
      description: `TradingView API encountered an error that prevented normal operation.${contextStr}`,
      limitation: errorMessage,
      recommendations: recommendations,
      acceptanceCriteria: acceptanceCriteria,
      tags: ['Bug', 'TradingView-API', 'Infrastructure', 'Auto-Reported'],
      priority: 'high', // API failures are high priority
      status: 'pending',
      source: 'TradingView API Health Monitor',
      createdAt: now,
      updatedAt: now
    };

    // Load, add, and save
    const cards = loadEnhancements();
    cards.unshift(newCard); // Add at beginning
    saveEnhancements(cards);

    logger.info('Bug report created', {
      cardId: cardId,
      title: title,
      filePath: getEnhancementsFilePath()
    });

    return cardId;
  } catch (error) {
    logger.error('Failed to report bug', {
      error: error instanceof Error ? error.message : String(error),
      title: title
    });
    return null;
  }
}

