import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Check if device has microphone access
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch {
    return false
  }
}

/**
 * Convert blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Check if browser supports Web Audio API
 */
export function supportsWebAudio(): boolean {
  return !!(window.AudioContext || (window as any).webkitAudioContext)
}

/**
 * Check if browser supports Media Recorder API
 */
export function supportsMediaRecorder(): boolean {
  return !!window.MediaRecorder
}

/**
 * Get device info for analytics
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    memory: (navigator as any).deviceMemory || 'unknown',
    connection: (navigator as any).connection?.effectiveType || 'unknown',
  }
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minute = 60 * 1000
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  const year = day * 365
  
  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < week) return `${Math.floor(diff / day)}d ago`
  if (diff < month) return `${Math.floor(diff / week)}w ago`
  if (diff < year) return `${Math.floor(diff / month)}mo ago`
  return `${Math.floor(diff / year)}y ago`
}

/**
 * Validate Arabic text
 */
export function isArabicText(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return arabicRegex.test(text)
}

/**
 * Clean Arabic text (remove diacritics and normalize for comparison)
 */
export function cleanArabicText(text: string): string {
  let cleaned = text
  
  // Remove all diacritics (harakat) - comprehensive range
  cleaned = cleaned.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1\u08E3-\u08FF\uFE70-\uFE7F]/g, '')
  
  // Normalize common Arabic character variations
  cleaned = cleaned
    // Normalize Alef variations
    .replace(/[أإآا]/g, 'ا')
    // Normalize Heh variations  
    .replace(/[هة]/g, 'ه')
    // Normalize Yeh variations
    .replace(/[يىئ]/g, 'ي')
    // Normalize Waw variations
    .replace(/[ؤو]/g, 'و')
    // Normalize Teh Marbuta
    .replace(/ة/g, 'ه')
    // Remove Kashida (Arabic tatweel)
    .replace(/ـ/g, '')
    // Remove extra whitespace and normalize
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  
  return cleaned
}

/**
 * Calculate Levenshtein distance for text comparison
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Calculate text similarity percentage
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 100
  
  const distance = levenshteinDistance(str1, str2)
  return Math.round(((maxLength - distance) / maxLength) * 100)
}

/**
 * Local storage utilities with error handling
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any
  if (typeof obj === 'object') {
    const clonedObj = {} as any
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

/**
 * Wait for a specified amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error
    
    await sleep(delay)
    return retry(fn, retries - 1, delay * 2)
  }
}