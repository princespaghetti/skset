import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { extractTarGz } from '../../src/lib/tar.ts';

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), 'skset-tar-test-'));
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe('tar extraction', () => {
	it('should extract a simple tar.gz file', async () => {
		// Create a simple tar.gz with one file
		const tarPath = join(tempDir, 'test.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: 'test.txt', content: 'Hello, World!', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir);

		expect(files).toContain('test.txt');
		expect(existsSync(join(extractDir, 'test.txt'))).toBe(true);

		const content = await Bun.file(join(extractDir, 'test.txt')).text();
		expect(content).toBe('Hello, World!');
	});

	it('should extract directories', async () => {
		const tarPath = join(tempDir, 'test.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: 'mydir/', content: '', type: 'directory' },
			{ name: 'mydir/file.txt', content: 'nested', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir);

		expect(files).toContain('mydir/');
		expect(files).toContain('mydir/file.txt');
		expect(existsSync(join(extractDir, 'mydir'))).toBe(true);
		expect(existsSync(join(extractDir, 'mydir', 'file.txt'))).toBe(true);
	});

	it('should handle strip option', async () => {
		const tarPath = join(tempDir, 'test.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: 'repo-abc123/skills/pdf/SKILL.md', content: 'skill content', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir, { strip: 1 });

		expect(files).toContain('skills/pdf/SKILL.md');
		expect(existsSync(join(extractDir, 'skills', 'pdf', 'SKILL.md'))).toBe(true);
		expect(existsSync(join(extractDir, 'repo-abc123'))).toBe(false);
	});

	it('should handle filter option', async () => {
		const tarPath = join(tempDir, 'test.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: 'skills/pdf/SKILL.md', content: 'skill', type: 'file' },
			{ name: 'other/file.txt', content: 'other', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir, {
			filter: (entry) => entry.name.startsWith('skills/'),
		});

		expect(files).toContain('skills/pdf/SKILL.md');
		expect(files).not.toContain('other/file.txt');
		expect(existsSync(join(extractDir, 'skills', 'pdf', 'SKILL.md'))).toBe(true);
		expect(existsSync(join(extractDir, 'other'))).toBe(false);
	});

	it('should handle multiple files', async () => {
		const tarPath = join(tempDir, 'test.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: 'file1.txt', content: 'content1', type: 'file' },
			{ name: 'file2.txt', content: 'content2', type: 'file' },
			{ name: 'file3.txt', content: 'content3', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir);

		expect(files.length).toBe(3);
		expect(files).toContain('file1.txt');
		expect(files).toContain('file2.txt');
		expect(files).toContain('file3.txt');
	});

	it('should handle nested directories', async () => {
		const tarPath = join(tempDir, 'test.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: 'a/', type: 'directory', content: '' },
			{ name: 'a/b/', type: 'directory', content: '' },
			{ name: 'a/b/c/', type: 'directory', content: '' },
			{ name: 'a/b/c/file.txt', type: 'file', content: 'deep' },
		]);

		const extractDir = join(tempDir, 'extract');
		await extractTarGz(tarPath, extractDir);

		expect(existsSync(join(extractDir, 'a', 'b', 'c', 'file.txt'))).toBe(true);
		const content = await Bun.file(join(extractDir, 'a', 'b', 'c', 'file.txt')).text();
		expect(content).toBe('deep');
	});

	it('should create parent directories automatically', async () => {
		const tarPath = join(tempDir, 'test.tar.gz');
		// Create a file without explicitly creating its parent directory
		await createTestTarGz(tarPath, [{ name: 'parent/child/file.txt', content: 'auto', type: 'file' }]);

		const extractDir = join(tempDir, 'extract');
		await extractTarGz(tarPath, extractDir);

		expect(existsSync(join(extractDir, 'parent', 'child', 'file.txt'))).toBe(true);
	});
});

describe('tar security - path traversal protection', () => {
	it('should block path traversal with ../ sequences', async () => {
		const tarPath = join(tempDir, 'malicious.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: '../../../etc/passwd', content: 'malicious', type: 'file' },
			{ name: 'safe.txt', content: 'safe', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir);

		// Should only extract safe files
		expect(files).toContain('safe.txt');
		expect(files).not.toContain('../../../etc/passwd');

		// Verify malicious file was not written outside extraction dir
		expect(existsSync(join(extractDir, 'safe.txt'))).toBe(true);
		expect(existsSync('/etc/passwd-from-test')).toBe(false);
	});

	it('should block absolute paths', async () => {
		const tarPath = join(tempDir, 'malicious.tar.gz');
		const maliciousPath = join(tempDir, 'outside', 'malicious.txt');

		await createTestTarGz(tarPath, [
			{ name: maliciousPath, content: 'malicious', type: 'file' },
			{ name: 'safe.txt', content: 'safe', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir);

		// Should only extract safe files
		expect(files).toContain('safe.txt');
		expect(files).not.toContain(maliciousPath);

		// Verify no files were written outside extraction directory
		expect(existsSync(join(tempDir, 'outside', 'malicious.txt'))).toBe(false);
	});

	it('should block paths that traverse up then down', async () => {
		const tarPath = join(tempDir, 'malicious.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: '../../tmp/malicious.txt', content: 'malicious', type: 'file' },
			{ name: 'safe.txt', content: 'safe', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir);

		// Should only extract safe files
		expect(files).toContain('safe.txt');
		expect(files.length).toBe(1);
	});

	it('should allow legitimate nested paths', async () => {
		const tarPath = join(tempDir, 'test.tar.gz');
		await createTestTarGz(tarPath, [
			{ name: 'skills/pdf/SKILL.md', content: 'legitimate', type: 'file' },
			{ name: 'scripts/helper.sh', content: 'script', type: 'file' },
		]);

		const extractDir = join(tempDir, 'extract');
		const files = await extractTarGz(tarPath, extractDir);

		// All legitimate paths should be extracted
		expect(files).toContain('skills/pdf/SKILL.md');
		expect(files).toContain('scripts/helper.sh');
		expect(existsSync(join(extractDir, 'skills', 'pdf', 'SKILL.md'))).toBe(true);
		expect(existsSync(join(extractDir, 'scripts', 'helper.sh'))).toBe(true);
	});
});

/**
 * Helper function to create a test tar.gz file
 * This creates a minimal USTAR-format tar archive for testing
 */
async function createTestTarGz(
	outputPath: string,
	entries: Array<{ name: string; content: string; type: 'file' | 'directory' }>,
): Promise<void> {
	const blocks: Uint8Array[] = [];

	for (const entry of entries) {
		// Create USTAR header (512 bytes)
		const header = new Uint8Array(512);

		// Name (offset 0, 100 bytes)
		writeString(header, 0, entry.name, 100);

		// Mode (offset 100, 8 bytes) - "0000644 " for files, "0000755 " for dirs
		const mode = entry.type === 'directory' ? '0000755 ' : '0000644 ';
		writeString(header, 100, mode, 8);

		// UID/GID (offset 108, 8 bytes each) - "0000000 "
		writeString(header, 108, '0000000 ', 8);
		writeString(header, 116, '0000000 ', 8);

		// Size (offset 124, 12 bytes) - octal file size
		const size = entry.type === 'directory' ? 0 : entry.content.length;
		const sizeOctal = size.toString(8).padStart(11, '0') + ' ';
		writeString(header, 124, sizeOctal, 12);

		// Mtime (offset 136, 12 bytes) - current time in octal
		const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
		writeString(header, 136, mtime, 12);

		// Checksum placeholder (offset 148, 8 bytes) - will calculate after
		writeString(header, 148, '        ', 8);

		// Typeflag (offset 156, 1 byte) - '0' for file, '5' for directory
		header[156] = entry.type === 'directory' ? 53 : 48; // '5' or '0'

		// Magic (offset 257, 6 bytes) - "ustar\0"
		writeString(header, 257, 'ustar\0', 6);

		// Version (offset 263, 2 bytes) - "00"
		writeString(header, 263, '00', 2);

		// Calculate checksum
		let checksum = 0;
		for (let i = 0; i < 512; i++) {
			checksum += header[i];
		}
		const checksumOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
		writeString(header, 148, checksumOctal, 8);

		blocks.push(header);

		// Add file content if not a directory
		if (entry.type === 'file' && entry.content.length > 0) {
			const contentBytes = new TextEncoder().encode(entry.content);
			const paddedSize = Math.ceil(contentBytes.length / 512) * 512;
			const contentBlock = new Uint8Array(paddedSize);
			contentBlock.set(contentBytes);
			blocks.push(contentBlock);
		}
	}

	// Add two zero blocks to mark end of archive
	blocks.push(new Uint8Array(512));
	blocks.push(new Uint8Array(512));

	// Combine all blocks
	const totalSize = blocks.reduce((sum, block) => sum + block.length, 0);
	const tarData = new Uint8Array(totalSize);
	let offset = 0;
	for (const block of blocks) {
		tarData.set(block, offset);
		offset += block.length;
	}

	// Compress with gzip
	const compressed = Bun.gzipSync(tarData);

	// Write to file
	await writeFile(outputPath, compressed);
}

/**
 * Helper to write a string to a Uint8Array at a specific offset
 */
function writeString(buf: Uint8Array, offset: number, str: string, maxLength: number): void {
	const bytes = new TextEncoder().encode(str);
	const length = Math.min(bytes.length, maxLength);
	buf.set(bytes.slice(0, length), offset);
}
