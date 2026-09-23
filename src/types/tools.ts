export type ToolCategory =
  | 'pdf'
  | 'image'
  | 'pdf-image'
  | 'conversion'
  | 'compression'
  | 'utility';

export interface ToolDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: ToolCategory;
  iconName: string;
  badge?: string;
  popular?: boolean;
  supportedFormats: string[];
  keywords: string[];
}

export interface ProcessedResult {
  fileName: string;
  fileSize: number;
  originalSize?: number;
  blob: Blob;
  downloadUrl: string;
  format: string;
  pagesCount?: number;
  width?: number;
  height?: number;
}

export type ThemeMode = 'dark' | 'light' | 'system';
