/**
 * markdownLinkParser - Utility for extracting links and metadata from markdown files.
 *
 * Used by the Document Graph feature to build a graph of document relationships.
 * Extracts:
 * - Internal links (wiki-style and standard markdown)
 * - External links (with domain extraction)
 * - Front matter metadata
 */

import * as path from 'path';

/**
 * Represents an external link with its URL and extracted domain
 */
export interface ExternalLink {
  url: string;
  domain: string;
}

/**
 * Result of parsing a markdown file for links
 */
export interface ParsedMarkdownLinks {
  /** Resolved relative paths to internal .md files */
  internalLinks: string[];
  /** External URLs with their domains */
  externalLinks: ExternalLink[];
  /** Parsed front matter key-value pairs */
  frontMatter: Record<string, unknown>;
}

// Regex patterns - aligned with remarkFileLinks.ts for consistency

/**
 * Wiki-style links: [[Note Name]] or [[Folder/Note]] or [[Folder/Note|Display Text]]
 * The pipe syntax allows custom display text: [[path|display]]
 * Captures: [1] = path, [2] = optional display text
 */
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Standard markdown links: [text](url)
 * Captures: [1] = display text, [2] = url
 */
const MARKDOWN_LINK_PATTERN = /\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Front matter delimiter pattern - matches YAML front matter block
 * Content between opening and closing ---
 */
const FRONT_MATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * URL pattern for detecting external links
 */
const URL_PATTERN = /^https?:\/\//i;

/**
 * Extract the domain from a URL, stripping www. and path
 * @param url - Full URL string
 * @returns Domain name (e.g., "github.com" from "https://www.github.com/user/repo")
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname;
    // Strip www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    // If URL parsing fails, try basic extraction
    const match = url.match(/^https?:\/\/(?:www\.)?([^/]+)/i);
    return match ? match[1] : url;
  }
}

/**
 * Parse simple YAML key-value pairs from front matter content.
 * Handles basic YAML syntax (key: value on each line).
 * Does not handle nested objects or arrays.
 */
function parseFrontMatter(content: string): Record<string, unknown> {
  const match = content.match(FRONT_MATTER_PATTERN);
  if (!match) {
    return {};
  }

  const yamlContent = match[1];
  const result: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match key: value pattern
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      let value: string | boolean | number = trimmed.substring(colonIndex + 1).trim();

      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Try to parse as boolean or number
      if (value === 'true') {
        result[key] = true;
      } else if (value === 'false') {
        result[key] = false;
      } else if (value !== '' && !isNaN(Number(value))) {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Resolve a relative link path to a normalized path
 * @param linkPath - The path from the link (e.g., "../docs/file.md")
 * @param currentFilePath - The path of the file containing the link
 * @returns Normalized relative path from project root, or null if invalid
 */
function resolveRelativePath(linkPath: string, currentFilePath: string): string | null {
  // Skip URLs, anchors, and mailto links
  if (URL_PATTERN.test(linkPath) || linkPath.startsWith('#') || linkPath.startsWith('mailto:')) {
    return null;
  }

  // Get the directory of the current file
  const currentDir = path.dirname(currentFilePath);

  // Decode URL-encoded characters (e.g., %20 -> space)
  const decodedPath = decodeURIComponent(linkPath);

  // Join and normalize the path
  let resolved = path.join(currentDir, decodedPath);

  // Normalize path separators and remove leading ./
  resolved = resolved.replace(/\\/g, '/');
  if (resolved.startsWith('./')) {
    resolved = resolved.slice(2);
  }

  // Ensure it ends with .md if it doesn't have an extension
  if (!path.extname(resolved)) {
    resolved = resolved + '.md';
  }

  return resolved;
}

/**
 * Parse a markdown file's content to extract links and front matter
 * @param content - The markdown file content
 * @param filePath - The relative path of the file (used to resolve relative links)
 * @returns Parsed links and metadata
 */
export function parseMarkdownLinks(content: string, filePath: string): ParsedMarkdownLinks {
  const internalLinks: string[] = [];
  const externalLinks: ExternalLink[] = [];
  const frontMatter = parseFrontMatter(content);

  // Track seen links to avoid duplicates
  const seenInternal = new Set<string>();
  const seenExternal = new Set<string>();

  // Parse wiki-style links: [[path]] or [[path|text]]
  let match;
  WIKI_LINK_PATTERN.lastIndex = 0;
  while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
    const linkPath = match[1].trim();

    // Skip image embeds (handled separately in graph builder if needed)
    if (linkPath.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i)) {
      continue;
    }

    // Resolve the path relative to current file
    const resolved = resolveRelativePath(linkPath, filePath);
    if (resolved && !seenInternal.has(resolved)) {
      seenInternal.add(resolved);
      internalLinks.push(resolved);
    }
  }

  // Parse standard markdown links: [text](url)
  MARKDOWN_LINK_PATTERN.lastIndex = 0;
  while ((match = MARKDOWN_LINK_PATTERN.exec(content)) !== null) {
    const linkUrl = match[2].trim();

    // Check if it's an external URL
    if (URL_PATTERN.test(linkUrl)) {
      if (!seenExternal.has(linkUrl)) {
        seenExternal.add(linkUrl);
        externalLinks.push({
          url: linkUrl,
          domain: extractDomain(linkUrl),
        });
      }
    } else {
      // Internal link
      const resolved = resolveRelativePath(linkUrl, filePath);
      if (resolved && !seenInternal.has(resolved)) {
        // Only include markdown files as internal links
        if (resolved.endsWith('.md')) {
          seenInternal.add(resolved);
          internalLinks.push(resolved);
        }
      }
    }
  }

  return {
    internalLinks,
    externalLinks,
    frontMatter,
  };
}

export default parseMarkdownLinks;
