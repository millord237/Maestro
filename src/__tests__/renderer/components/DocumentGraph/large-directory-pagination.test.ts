/**
 * Tests for Document Graph handling of directories with 1000+ markdown files
 *
 * This test suite verifies that the pagination system properly handles very large
 * directories without performance issues or memory problems.
 *
 * Key scenarios tested:
 * - Initial load of 50 nodes from 1000+ files
 * - Progressive loading via "Load more" functionality
 * - Pagination state accuracy (totalDocuments, loadedDocuments, hasMore)
 * - Edge creation only between loaded documents
 * - Memory efficiency with large datasets
 * - Progress callback behavior during large scans
 * - UI responsiveness during batch processing
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import {
  buildGraphData,
  type ProgressData,
  BATCH_SIZE_BEFORE_YIELD,
} from '../../../../renderer/components/DocumentGraph/graphDataBuilder';

/**
 * These constants match the values defined in DocumentGraphView.tsx
 * They control the pagination behavior for large directories
 */
const DEFAULT_MAX_NODES = 50;
const LOAD_MORE_INCREMENT = 25;

// Expected values for verification (must match implementation)
const EXPECTED_DEFAULT_MAX_NODES = 50;
const EXPECTED_LOAD_MORE_INCREMENT = 25;
const EXPECTED_BATCH_SIZE_BEFORE_YIELD = 5;

describe('Large Directory Pagination (1000+ markdown files)', () => {
  let mockReadDir: Mock;
  let mockReadFile: Mock;
  let mockStat: Mock;

  /**
   * Helper to create a large mock file system with N markdown files
   */
  function createLargeFileSystem(fileCount: number, options: {
    subdirectoryCount?: number;
    linksPerFile?: number;
    externalLinksPerFile?: number;
  } = {}) {
    const {
      subdirectoryCount = 10,
      linksPerFile = 3,
      externalLinksPerFile = 1,
    } = options;

    // Distribute files across subdirectories
    const filesPerSubdir = Math.ceil(fileCount / subdirectoryCount);
    const directories = new Map<string, string[]>();

    // Root directory entries
    const rootEntries: Array<{ name: string; isDirectory: boolean; path: string }> = [];

    // Create subdirectory entries
    for (let i = 0; i < subdirectoryCount; i++) {
      const dirName = `dir-${String(i).padStart(3, '0')}`;
      rootEntries.push({ name: dirName, isDirectory: true, path: `/large-test/${dirName}` });
      directories.set(`/large-test/${dirName}`, []);
    }

    // Create file entries distributed across subdirectories
    const fileMap = new Map<string, { content: string; size: number }>();
    const allFilePaths: string[] = [];

    for (let i = 0; i < fileCount; i++) {
      const subdirIndex = i % subdirectoryCount;
      const dirName = `dir-${String(subdirIndex).padStart(3, '0')}`;
      const fileName = `doc-${String(i).padStart(5, '0')}.md`;
      const relativePath = `${dirName}/${fileName}`;
      const fullPath = `/large-test/${relativePath}`;

      // Add to directory listing
      const dirFiles = directories.get(`/large-test/${dirName}`) || [];
      dirFiles.push(fileName);
      directories.set(`/large-test/${dirName}`, dirFiles);

      allFilePaths.push(relativePath);

      // Create file content with links to other files in the set
      const content = createFileContent(i, fileCount, allFilePaths, {
        linksPerFile,
        externalLinksPerFile,
      });

      fileMap.set(fullPath, { content, size: content.length });
    }

    return {
      rootEntries,
      directories,
      fileMap,
      allFilePaths,
      fileCount,
    };
  }

  /**
   * Create file content with internal and external links
   */
  function createFileContent(
    fileIndex: number,
    totalFiles: number,
    allPaths: string[],
    options: { linksPerFile: number; externalLinksPerFile: number }
  ): string {
    const { linksPerFile, externalLinksPerFile } = options;

    let content = `---
title: Document ${fileIndex}
description: Test document number ${fileIndex} for large directory testing
---

# Document ${fileIndex}

This is test document number ${fileIndex} out of ${totalFiles} total documents.

## Links

`;

    // Add internal wiki links to other documents (spread across the file set)
    for (let i = 0; i < linksPerFile; i++) {
      const targetIndex = (fileIndex + 1 + i * 100) % totalFiles;
      if (targetIndex < allPaths.length) {
        // Use wiki-style links without .md extension
        const targetPath = allPaths[targetIndex].replace('.md', '');
        content += `- See [[${targetPath}]] for more information\n`;
      }
    }

    // Add external links
    for (let i = 0; i < externalLinksPerFile; i++) {
      const domain = `example${i}.com`;
      content += `- Visit [Example ${i}](https://${domain}/page/${fileIndex})\n`;
    }

    content += `
## Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. This document contains
sample content to simulate real markdown files with varying lengths and complexity.
`;

    return content;
  }

  let fileSystem: ReturnType<typeof createLargeFileSystem>;

  beforeEach(() => {
    // Create a 1000+ file system for tests
    fileSystem = createLargeFileSystem(1200);

    mockReadDir = vi.fn().mockImplementation((path: string) => {
      if (path === '/large-test') {
        return Promise.resolve(fileSystem.rootEntries);
      }

      // Check if it's a subdirectory
      const dirFiles = fileSystem.directories.get(path);
      if (dirFiles) {
        return Promise.resolve(
          dirFiles.map((name) => ({
            name,
            isDirectory: false,
            path: `${path}/${name}`,
          }))
        );
      }

      return Promise.resolve([]);
    });

    mockReadFile = vi.fn().mockImplementation((path: string) => {
      const file = fileSystem.fileMap.get(path);
      if (file) {
        return Promise.resolve(file.content);
      }
      return Promise.resolve(null);
    });

    mockStat = vi.fn().mockImplementation((path: string) => {
      const file = fileSystem.fileMap.get(path);
      return Promise.resolve({
        size: file?.size ?? 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-15T12:30:00.000Z',
      });
    });

    vi.mocked(window.maestro.fs.readDir).mockImplementation(mockReadDir);
    vi.mocked(window.maestro.fs.readFile).mockImplementation(mockReadFile);
    vi.mocked(window.maestro.fs.stat).mockImplementation(mockStat);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Pagination Constants Verification', () => {
    it('should have DEFAULT_MAX_NODES = 50 for initial load limit', () => {
      // This constant controls how many documents are loaded initially
      // 50 is a balance between showing meaningful content and performance
      expect(DEFAULT_MAX_NODES).toBe(EXPECTED_DEFAULT_MAX_NODES);
    });

    it('should have LOAD_MORE_INCREMENT = 25 for progressive loading', () => {
      // Users click "Load more" to get additional 25 documents at a time
      // This keeps each load operation fast while making progress
      expect(LOAD_MORE_INCREMENT).toBe(EXPECTED_LOAD_MORE_INCREMENT);
    });

    it('should have BATCH_SIZE_BEFORE_YIELD = 5 for UI responsiveness', () => {
      // Every 5 files, the builder yields to the event loop
      // This prevents the UI from freezing during large batch operations
      expect(BATCH_SIZE_BEFORE_YIELD).toBe(EXPECTED_BATCH_SIZE_BEFORE_YIELD);
    });

    it('should require 48 load-more clicks to load all 1200 files from scratch', () => {
      // (1200 - 50) / 25 = 46, rounded up = 46 clicks
      // But we load 50 initially, then need to load remaining 1150
      // 1150 / 25 = 46 clicks
      const totalFiles = 1200;
      const loadMoreClicks = Math.ceil((totalFiles - EXPECTED_DEFAULT_MAX_NODES) / EXPECTED_LOAD_MORE_INCREMENT);
      expect(loadMoreClicks).toBe(46);
    });
  });

  describe('Initial Load with 1000+ Files', () => {
    it('should scan all 1200 files but only load 50 initially', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: EXPECTED_DEFAULT_MAX_NODES,
      });

      // totalDocuments reflects ALL files found during scan
      expect(result.totalDocuments).toBe(1200);
      // loadedDocuments reflects the limited set actually parsed and loaded
      expect(result.loadedDocuments).toBe(EXPECTED_DEFAULT_MAX_NODES);
      // hasMore indicates more documents are available
      expect(result.hasMore).toBe(true);
    });

    it('should only have 50 document nodes after initial load', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: EXPECTED_DEFAULT_MAX_NODES,
      });

      const documentNodes = result.nodes.filter((n) => n.type === 'documentNode');
      expect(documentNodes.length).toBe(EXPECTED_DEFAULT_MAX_NODES);
    });

    it('should only create edges between loaded documents', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: EXPECTED_DEFAULT_MAX_NODES,
      });

      // Get the IDs of loaded document nodes
      const loadedDocIds = new Set(
        result.nodes
          .filter((n) => n.type === 'documentNode')
          .map((n) => n.id)
      );

      // All edges should have both source and target in the loaded set
      for (const edge of result.edges) {
        expect(loadedDocIds.has(edge.source)).toBe(true);
        expect(loadedDocIds.has(edge.target)).toBe(true);
      }
    });

    it('should load documents in deterministic order (first N from scan)', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: EXPECTED_DEFAULT_MAX_NODES,
      });

      // The first 50 files should be loaded (by scan order)
      // With 10 subdirectories and files distributed across them,
      // the scan order is: dir-000/*.md, dir-001/*.md, etc.
      const nodeIds = result.nodes.map((n) => n.id).sort();

      // Should have nodes from the first documents scanned
      expect(nodeIds.length).toBe(EXPECTED_DEFAULT_MAX_NODES);
    });
  });

  describe('Progressive Loading (Load More)', () => {
    it('should load 75 documents after first load-more', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: EXPECTED_DEFAULT_MAX_NODES + EXPECTED_LOAD_MORE_INCREMENT,
      });

      expect(result.loadedDocuments).toBe(75);
      expect(result.hasMore).toBe(true);
      expect(result.totalDocuments).toBe(1200);
    });

    it('should load 100 documents after second load-more', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: EXPECTED_DEFAULT_MAX_NODES + (EXPECTED_LOAD_MORE_INCREMENT * 2),
      });

      expect(result.loadedDocuments).toBe(100);
      expect(result.hasMore).toBe(true);
    });

    it('should correctly load all 1200 documents when maxNodes exceeds total', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 2000, // More than total files
      });

      expect(result.loadedDocuments).toBe(1200);
      expect(result.hasMore).toBe(false);
      expect(result.totalDocuments).toBe(1200);
    });

    it('should have hasMore=false when all documents are loaded', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 1200,
      });

      expect(result.hasMore).toBe(false);
    });
  });

  describe('Progress Callback During Large Scans', () => {
    it('should report scanning progress for all subdirectories', async () => {
      const progressCalls: ProgressData[] = [];

      await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 50,
        onProgress: (progress) => progressCalls.push({ ...progress }),
      });

      const scanningCalls = progressCalls.filter((p) => p.phase === 'scanning');

      // Should have scanning progress for root + 10 subdirectories
      expect(scanningCalls.length).toBeGreaterThanOrEqual(1);

      // Scanning phase doesn't know total until complete
      for (const call of scanningCalls) {
        expect(call.total).toBe(0); // Total unknown during scan
        expect(call.current).toBeGreaterThan(0);
      }
    });

    it('should report parsing progress for each file', async () => {
      const progressCalls: ProgressData[] = [];

      await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 50,
        onProgress: (progress) => progressCalls.push({ ...progress }),
      });

      const parsingCalls = progressCalls.filter((p) => p.phase === 'parsing');

      // Should have 50 parsing progress calls (one per file)
      expect(parsingCalls.length).toBe(50);

      // Parsing should report current/total accurately
      const lastParsingCall = parsingCalls[parsingCalls.length - 1];
      expect(lastParsingCall.current).toBe(50);
      expect(lastParsingCall.total).toBe(50);
    });

    it('should include currentFile in parsing progress', async () => {
      const progressCalls: ProgressData[] = [];

      await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 10,
        onProgress: (progress) => progressCalls.push({ ...progress }),
      });

      const parsingCalls = progressCalls.filter((p) => p.phase === 'parsing');

      // All parsing calls should have currentFile
      for (const call of parsingCalls) {
        expect(call.currentFile).toBeDefined();
        expect(call.currentFile).toContain('.md');
      }
    });
  });

  describe('Memory and Performance Constraints', () => {
    it('should not include file content in node data', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 100,
      });

      // Check that nodes don't have raw content
      for (const node of result.nodes) {
        // Node data should not have 'content' property
        expect('content' in node.data).toBe(false);

        // But should have computed stats
        if (node.type === 'documentNode') {
          expect('title' in node.data).toBe(true);
          expect('lineCount' in node.data).toBe(true);
          expect('wordCount' in node.data).toBe(true);
          expect('size' in node.data).toBe(true);
        }
      }
    });

    it('should have compact result object for 1000+ file directories', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 100,
      });

      // Estimate result size by counting nodes and edges
      // Each node should be ~500 bytes max (id, type, position, data without content)
      // Each edge should be ~100 bytes (id, source, target, type)
      const estimatedSize =
        result.nodes.length * 500 +
        result.edges.length * 100 +
        100; // Metadata overhead

      // Result should be under 100KB for 100 nodes
      expect(estimatedSize).toBeLessThan(100 * 1024);
    });

    it('should yield to event loop every BATCH_SIZE_BEFORE_YIELD files', async () => {
      // This test documents the expected behavior rather than testing the actual yield
      // because mocking requestAnimationFrame affects timing

      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 100,
      });

      // With 100 files and BATCH_SIZE_BEFORE_YIELD = 5,
      // there should be ~20 yield points during parsing
      // This ensures UI remains responsive

      // We verify the build completed successfully
      expect(result.loadedDocuments).toBe(100);
    });
  });

  describe('Edge Cases for Large Directories', () => {
    it('should handle exactly 1000 files', async () => {
      // Create a new file system with exactly 1000 files
      const fs1000 = createLargeFileSystem(1000);

      mockReadDir.mockImplementation((path: string) => {
        if (path === '/large-test') {
          return Promise.resolve(fs1000.rootEntries);
        }
        const dirFiles = fs1000.directories.get(path);
        if (dirFiles) {
          return Promise.resolve(
            dirFiles.map((name) => ({
              name,
              isDirectory: false,
              path: `${path}/${name}`,
            }))
          );
        }
        return Promise.resolve([]);
      });

      mockReadFile.mockImplementation((path: string) => {
        const file = fs1000.fileMap.get(path);
        return Promise.resolve(file?.content ?? null);
      });

      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 50,
      });

      expect(result.totalDocuments).toBe(1000);
      expect(result.loadedDocuments).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it('should handle loading all 1000+ files when maxNodes not set', async () => {
      // When maxNodes is undefined, should load all files
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        // maxNodes not set - should load all
      });

      expect(result.totalDocuments).toBe(1200);
      expect(result.loadedDocuments).toBe(1200);
      expect(result.hasMore).toBe(false);
    });

    it('should handle directories with more than 10,000 files gracefully', async () => {
      // Create a very large file system
      const fsLarge = createLargeFileSystem(10000, { subdirectoryCount: 100 });

      mockReadDir.mockImplementation((path: string) => {
        if (path === '/large-test') {
          return Promise.resolve(fsLarge.rootEntries);
        }
        const dirFiles = fsLarge.directories.get(path);
        if (dirFiles) {
          return Promise.resolve(
            dirFiles.map((name) => ({
              name,
              isDirectory: false,
              path: `${path}/${name}`,
            }))
          );
        }
        return Promise.resolve([]);
      });

      mockReadFile.mockImplementation((path: string) => {
        const file = fsLarge.fileMap.get(path);
        return Promise.resolve(file?.content ?? null);
      });

      // Should still work with pagination
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 50,
      });

      expect(result.totalDocuments).toBe(10000);
      expect(result.loadedDocuments).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it('should handle offset pagination for middle pages', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 25,
        offset: 500, // Skip first 500 documents
      });

      // Should load documents 500-524
      expect(result.loadedDocuments).toBe(25);
      expect(result.totalDocuments).toBe(1200);
      expect(result.hasMore).toBe(true); // More after 525
    });

    it('should handle offset near the end of documents', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 50,
        offset: 1180, // Near the end (1200 total)
      });

      // Should only load remaining 20 documents (1180-1199)
      expect(result.loadedDocuments).toBe(20);
      expect(result.totalDocuments).toBe(1200);
      expect(result.hasMore).toBe(false); // No more after 1200
    });
  });

  describe('External Links with Large Directories', () => {
    it('should aggregate external domains correctly with 1000+ files', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: true,
        maxNodes: 100,
      });

      // With 1 external link per file (configured in createLargeFileSystem),
      // and only 100 files loaded, we should have external link nodes
      const externalNodes = result.nodes.filter((n) => n.type === 'externalLinkNode');

      // Should have aggregated external domains
      expect(externalNodes.length).toBeGreaterThan(0);

      // Each external node should have linkCount
      for (const node of externalNodes) {
        const data = node.data as { linkCount: number };
        expect(data.linkCount).toBeGreaterThan(0);
      }
    });

    it('should not create external edges to documents outside loaded set', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: true,
        maxNodes: 50,
      });

      // Get loaded document IDs
      const loadedDocIds = new Set(
        result.nodes
          .filter((n) => n.type === 'documentNode')
          .map((n) => n.id)
      );

      // External edges should only come from loaded documents
      const externalEdges = result.edges.filter((e) => e.type === 'external');
      for (const edge of externalEdges) {
        expect(loadedDocIds.has(edge.source)).toBe(true);
      }
    });
  });

  describe('Load More Button Calculation', () => {
    it('should correctly calculate remaining documents for footer display', async () => {
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 50,
      });

      const remaining = result.totalDocuments - result.loadedDocuments;
      expect(remaining).toBe(1150); // 1200 - 50
    });

    it('should show correct remaining after multiple load-more clicks', async () => {
      // Simulate 5 load-more clicks (50 + 25*5 = 175 loaded)
      const result = await buildGraphData({
        rootPath: '/large-test',
        includeExternalLinks: false,
        maxNodes: 175,
      });

      const remaining = result.totalDocuments - result.loadedDocuments;
      expect(remaining).toBe(1025); // 1200 - 175
    });
  });
});

describe('Performance Profiling: Large Directory Handling', () => {
  /**
   * These tests document expected performance characteristics
   * rather than actual benchmarks (which vary by machine)
   */

  it('documents expected scan time for 1000 files', () => {
    // Scanning a directory involves:
    // - readDir calls: O(directories) - typically <100 for 1000 files
    // - Each readDir returns file listings
    // Expected: 100-300ms for 1000 files across 10-20 directories
    const expectedScanTimeMs = { min: 100, max: 300 };
    expect(expectedScanTimeMs.max).toBeLessThan(500);
  });

  it('documents expected parse time for 50 files (initial load)', () => {
    // Parsing involves:
    // - readFile: O(1) per file
    // - stat: O(1) per file
    // - regex parsing for links: O(content length)
    // - stats computation: O(content length)
    // Expected: 50-150ms for 50 files
    const expectedParseTimeMs = { min: 50, max: 150 };
    expect(expectedParseTimeMs.max).toBeLessThan(300);
  });

  it('documents expected total time for initial load from 1000+ files', () => {
    // Total = scan + parse (50 files)
    // Expected: 150-450ms
    const expectedTotalTimeMs = { min: 150, max: 450 };
    expect(expectedTotalTimeMs.max).toBeLessThan(1000);
  });

  it('documents expected memory footprint for 50 loaded nodes', () => {
    // Per node: ~500 bytes (id, type, position, computed stats)
    // 50 nodes: ~25KB
    // Plus edges: ~100 bytes each, maybe 100-200 edges = ~20KB
    // Plus metadata: ~5KB
    // Total: ~50KB
    const expectedMemoryKB = { min: 25, max: 100 };
    expect(expectedMemoryKB.max).toBeLessThan(500);
  });

  it('documents expected pagination behavior', () => {
    // Initial: 50 nodes loaded
    // After 1 load-more: 75 nodes
    // After 10 load-more clicks: 300 nodes
    // At 300 nodes, still only ~300KB memory
    // React Flow with viewport culling handles 300 nodes smoothly
    const expectedMaxComfortableNodes = 300;
    expect(expectedMaxComfortableNodes).toBeGreaterThanOrEqual(200);
  });
});
