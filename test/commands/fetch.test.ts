import { describe, it, expect } from 'bun:test';
import { parseGitHubUrl } from '../../src/commands/fetch.ts';

describe('parseGitHubUrl', () => {
	it('should parse gh: shorthand format', () => {
		const result = parseGitHubUrl('gh:anthropics/skills');
		expect(result).toEqual({
			owner: 'anthropics',
			repo: 'skills',
			ref: 'main',
			path: undefined,
		});
	});

	it('should parse gh: shorthand with path', () => {
		const result = parseGitHubUrl('gh:anthropics/skills/skills/pdf');
		expect(result).toEqual({
			owner: 'anthropics',
			repo: 'skills',
			ref: 'main',
			path: 'skills/pdf',
		});
	});

	it('should parse github: shorthand format', () => {
		const result = parseGitHubUrl('github:owner/repo/path/to/skill');
		expect(result).toEqual({
			owner: 'owner',
			repo: 'repo',
			ref: 'main',
			path: 'path/to/skill',
		});
	});

	it('should parse full GitHub URL without branch', () => {
		const result = parseGitHubUrl('https://github.com/anthropics/skills');
		expect(result).toEqual({
			owner: 'anthropics',
			repo: 'skills',
			ref: 'main',
			path: undefined,
		});
	});

	it('should strip .git extension from repo name', () => {
		const result = parseGitHubUrl('https://github.com/anthropics/skills.git');
		expect(result).toEqual({
			owner: 'anthropics',
			repo: 'skills',
			ref: 'main',
			path: undefined,
		});
	});

	it('should parse full GitHub URL with branch', () => {
		const result = parseGitHubUrl('https://github.com/owner/repo/tree/develop');
		expect(result).toEqual({
			owner: 'owner',
			repo: 'repo',
			ref: 'develop',
			path: undefined,
		});
	});

	it('should parse full GitHub URL with branch and path', () => {
		const result = parseGitHubUrl('https://github.com/anthropics/skills/tree/main/skills/pdf');
		expect(result).toEqual({
			owner: 'anthropics',
			repo: 'skills',
			ref: 'main',
			path: 'skills/pdf',
		});
	});

	it('should parse URL with non-main branch and path', () => {
		const result = parseGitHubUrl('https://github.com/owner/repo/tree/develop/path/to/skill');
		expect(result).toEqual({
			owner: 'owner',
			repo: 'repo',
			ref: 'develop',
			path: 'path/to/skill',
		});
	});

	it('should handle deeply nested paths', () => {
		const result = parseGitHubUrl('gh:owner/repo/a/b/c/d/e');
		expect(result).toEqual({
			owner: 'owner',
			repo: 'repo',
			ref: 'main',
			path: 'a/b/c/d/e',
		});
	});

	it('should throw on invalid gh: format (missing repo)', () => {
		expect(() => parseGitHubUrl('gh:owner')).toThrow('Invalid GitHub URL format');
	});

	it('should throw on invalid URL format', () => {
		expect(() => parseGitHubUrl('https://gitlab.com/owner/repo')).toThrow(
			'Invalid GitHub URL format',
		);
	});

	it('should throw on malformed URL', () => {
		expect(() => parseGitHubUrl('not-a-url')).toThrow('Invalid GitHub URL format');
	});
});
