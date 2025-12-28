import { describe, it, expect } from 'bun:test';
import {
  SksetError,
  ValidationError,
  ConfigError,
  SkillNotFoundError,
  GroupNotFoundError,
  UserCancelledError,
} from '../../src/utils/errors.ts';

describe('Custom Error Classes', () => {
  describe('SksetError', () => {
    it('should create error with message only', () => {
      const error = new SksetError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
      expect(error.hint).toBeUndefined();
      expect(error.exitCode).toBe(1);
      expect(error.name).toBe('SksetError');
    });

    it('should create error with message and hint', () => {
      const error = new SksetError('File not found', 'Check the path and try again');
      expect(error.message).toBe('File not found');
      expect(error.hint).toBe('Check the path and try again');
      expect(error.exitCode).toBe(1);
    });

    it('should be instance of Error', () => {
      const error = new SksetError('test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof SksetError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should have exit code 2', () => {
      const error = new ValidationError('Invalid skill');
      expect(error.exitCode).toBe(2);
      expect(error.name).toBe('ValidationError');
    });

    it('should support hint', () => {
      const error = new ValidationError('Invalid name', 'Use lowercase and hyphens only');
      expect(error.message).toBe('Invalid name');
      expect(error.hint).toBe('Use lowercase and hyphens only');
    });
  });

  describe('ConfigError', () => {
    it('should have exit code 1', () => {
      const error = new ConfigError('Config not found');
      expect(error.exitCode).toBe(1);
      expect(error.name).toBe('ConfigError');
    });

    it('should support hint', () => {
      const error = new ConfigError('Invalid config', 'Run skset init');
      expect(error.hint).toBe('Run skset init');
    });
  });

  describe('SkillNotFoundError', () => {
    it('should have default hint', () => {
      const error = new SkillNotFoundError('my-skill');
      expect(error.message).toBe('Skill "my-skill" not found in library');
      expect(error.hint).toBe('Run "skset inventory --library" to see available skills');
      expect(error.exitCode).toBe(1);
    });

    it('should allow custom hint', () => {
      const error = new SkillNotFoundError('my-skill', 'Check your spelling');
      expect(error.message).toBe('Skill "my-skill" not found in library');
      expect(error.hint).toBe('Check your spelling');
    });
  });

  describe('GroupNotFoundError', () => {
    it('should have default hint', () => {
      const error = new GroupNotFoundError('my-group');
      expect(error.message).toBe('Group "my-group" does not exist');
      expect(error.hint).toBe('Run "skset groups list" to see available groups');
      expect(error.exitCode).toBe(1);
    });

    it('should allow custom hint', () => {
      const error = new GroupNotFoundError('my-group', 'Create it first');
      expect(error.message).toBe('Group "my-group" does not exist');
      expect(error.hint).toBe('Create it first');
    });
  });

  describe('UserCancelledError', () => {
    it('should have exit code 0', () => {
      const error = new UserCancelledError();
      expect(error.exitCode).toBe(0);
      expect(error.name).toBe('UserCancelledError');
    });

    it('should have default message', () => {
      const error = new UserCancelledError();
      expect(error.message).toBe('Operation cancelled by user');
    });

    it('should not have a hint', () => {
      const error = new UserCancelledError();
      expect(error.hint).toBeUndefined();
    });
  });
});

describe('Exit codes', () => {
  it('should have exit code 1 for SksetError', () => {
    const error = new SksetError('test error');
    expect(error.exitCode).toBe(1);
  });

  it('should have exit code 2 for ValidationError', () => {
    const error = new ValidationError('test error');
    expect(error.exitCode).toBe(2);
  });

  it('should have exit code 0 for UserCancelledError', () => {
    const error = new UserCancelledError();
    expect(error.exitCode).toBe(0);
  });

  it('should have exit code 1 for ConfigError', () => {
    const error = new ConfigError('test');
    expect(error.exitCode).toBe(1);
  });

  it('should have exit code 1 for SkillNotFoundError', () => {
    const error = new SkillNotFoundError('test');
    expect(error.exitCode).toBe(1);
  });

  it('should have exit code 1 for GroupNotFoundError', () => {
    const error = new GroupNotFoundError('test');
    expect(error.exitCode).toBe(1);
  });
});

describe('Error inheritance chain', () => {
  it('should maintain proper inheritance for SksetError subclasses', () => {
    const validationError = new ValidationError('test');
    expect(validationError instanceof ValidationError).toBe(true);
    expect(validationError instanceof SksetError).toBe(true);
    expect(validationError instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for ConfigError', () => {
    const configError = new ConfigError('test');
    expect(configError instanceof ConfigError).toBe(true);
    expect(configError instanceof SksetError).toBe(true);
    expect(configError instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for SkillNotFoundError', () => {
    const error = new SkillNotFoundError('test');
    expect(error instanceof SkillNotFoundError).toBe(true);
    expect(error instanceof SksetError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for GroupNotFoundError', () => {
    const error = new GroupNotFoundError('test');
    expect(error instanceof GroupNotFoundError).toBe(true);
    expect(error instanceof SksetError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for UserCancelledError', () => {
    const error = new UserCancelledError();
    expect(error instanceof UserCancelledError).toBe(true);
    expect(error instanceof SksetError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('Error differentiation', () => {
  it('should be able to differentiate error types', () => {
    const errors = [
      new SksetError('generic'),
      new ValidationError('validation'),
      new ConfigError('config'),
      new SkillNotFoundError('skill'),
      new GroupNotFoundError('group'),
      new UserCancelledError(),
    ];

    expect(errors[0] instanceof SksetError && !(errors[0] instanceof ValidationError)).toBe(true);
    expect(errors[1] instanceof ValidationError).toBe(true);
    expect(errors[2] instanceof ConfigError).toBe(true);
    expect(errors[3] instanceof SkillNotFoundError).toBe(true);
    expect(errors[4] instanceof GroupNotFoundError).toBe(true);
    expect(errors[5] instanceof UserCancelledError).toBe(true);
  });

  it('should have distinct exit codes', () => {
    expect(new SksetError('').exitCode).toBe(1);
    expect(new ValidationError('').exitCode).toBe(2);
    expect(new ConfigError('').exitCode).toBe(1);
    expect(new SkillNotFoundError('').exitCode).toBe(1);
    expect(new GroupNotFoundError('').exitCode).toBe(1);
    expect(new UserCancelledError().exitCode).toBe(0);
  });
});
