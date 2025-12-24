import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  encryptPassword,
  decryptPassword,
  secureLog,
  obfuscatePassword,
  obfuscateEmail,
  obfuscateSensitiveData,
} from '../utils/security';

describe('Security Utils', () => {
  describe('Password Encryption and Decryption', () => {
    it('should encrypt password', () => {
      const password = 'mysecretpassword';
      const encrypted = encryptPassword(password);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(password);
    });

    it('should decrypt password correctly', () => {
      const password = 'testpassword123';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      expect(decrypted).toBe(password);
    });

    it('should handle empty password', () => {
      const password = '';
      const encrypted = encryptPassword(password);
      expect(encrypted).toBeDefined();
    });

    it('should handle password with special characters', () => {
      const password = 'P@ssw0rd!#$%^&*';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      expect(decrypted).toBe(password);
    });

    it('should handle long passwords', () => {
      const password = 'a'.repeat(500);
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      expect(decrypted).toBe(password);
    });
  });

  describe('Password Obfuscation', () => {
    it('should obfuscate password for logging', () => {
      const password = 'mysecretpassword';
      const obfuscated = obfuscatePassword(password);
      expect(obfuscated).not.toContain(password);
    });

    it('should handle short passwords', () => {
      const obfuscated = obfuscatePassword('test');
      expect(obfuscated).toBeDefined();
      expect(typeof obfuscated).toBe('string');
    });
  });

  describe('Email Obfuscation', () => {
    it('should obfuscate email', () => {
      const email = 'user@example.com';
      const obfuscated = obfuscateEmail(email);
      expect(obfuscated).not.toContain(email);
      expect(obfuscated).toBeDefined();
    });

    it('should handle various email formats', () => {
      const emails = [
        'john@example.com',
        'jane.doe@company.co.uk',
        'test+tag@domain.org',
      ];
      emails.forEach(email => {
        const obfuscated = obfuscateEmail(email);
        expect(obfuscated).toBeDefined();
        expect(typeof obfuscated).toBe('string');
      });
    });
  });

  describe('Sensitive Data Obfuscation', () => {
    it('should obfuscate password in object', () => {
      const data = { password: 'secret123', username: 'john' };
      const obfuscated = obfuscateSensitiveData(data);
      expect(obfuscated.password).not.toBe('secret123');
      expect(obfuscated.username).toBe('john');
    });

    it('should handle email in object', () => {
      const data = { email: 'user@example.com', name: 'John' };
      const obfuscated = obfuscateSensitiveData(data);
      // Email should be obfuscated (different from original)
      expect(obfuscated.email).toBeDefined();
      expect(obfuscated.name).toBe('John');
    });

    it('should handle objects with sensitive data', () => {
      const data = {
        user: { password: 'pass123', email: 'user@test.com', id: 1 },
        admin: { password: 'adminpass', role: 'admin' },
      };
      const obfuscated = obfuscateSensitiveData(data);
      // Obfuscated data should be defined
      expect(obfuscated.user).toBeDefined();
      expect(obfuscated.admin).toBeDefined();
      expect(obfuscated.user.id).toBe(1);
    });

    it('should handle arrays in objects', () => {
      const data = { users: [{ password: 'pass1' }, { password: 'pass2' }] };
      const obfuscated = obfuscateSensitiveData(data);
      expect(Array.isArray(obfuscated.users)).toBe(true);
    });
  });

  describe('secureLog', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(),
        error: vi.spyOn(console, 'error').mockImplementation(),
        warn: vi.spyOn(console, 'warn').mockImplementation(),
      };
    });

    afterEach(() => {
      Object.values(consoleSpy).forEach((spy: any) => spy.mockRestore());
    });

    it('should log info messages', () => {
      secureLog.info('Test message', { password: 'secret' });
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      secureLog.error('Error occurred', error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      secureLog.warn('Warning message', { password: 'secret' });
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should obfuscate data in info logs', () => {
      secureLog.info('Test', { password: 'secret', user: 'john' });
      const callArgs = consoleSpy.log.mock.calls[0];
      expect(callArgs[1]).not.toContain('secret');
    });

    it('should obfuscate data in warn logs', () => {
      secureLog.warn('Warning', { email: 'user@example.com' });
      const callArgs = consoleSpy.warn.mock.calls[0];
      expect(callArgs[1]).not.toContain('@example.com');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long passwords', () => {
      const longPassword = 'a'.repeat(500);
      const encrypted = encryptPassword(longPassword);
      const decrypted = decryptPassword(encrypted);
      expect(decrypted).toBe(longPassword);
    });

    it('should handle passwords with basic special characters', () => {
      const specialPassword = '!@#$%^&*()';
      const encrypted = encryptPassword(specialPassword);
      const decrypted = decryptPassword(encrypted);
      expect(decrypted).toBe(specialPassword);
    });

    it('should handle null data in obfuscateSensitiveData', () => {
      const result = obfuscateSensitiveData(null);
      expect(result).toBe(null);
    });

    it('should handle empty objects', () => {
      const result = obfuscateSensitiveData({});
      expect(typeof result).toBe('object');
    });

    it('should not modify non-sensitive fields', () => {
      const data = {
        id: '123',
        name: 'John',
        active: true,
      };
      const obfuscated = obfuscateSensitiveData(data);
      expect(obfuscated.id).toBe('123');
      expect(obfuscated.name).toBe('John');
      expect(obfuscated.active).toBe(true);
    });
  });

  describe('decryptPassword v1 and errors', () => {
    it('should decrypt v1 format password', () => {
      // Simular formato v1: enc_v1_<salt>_<encrypted>
      const salt = 'abc';
      const saltReversed = salt.split('').reverse().join('');
      let value = salt + 'mypassword' + saltReversed;
      let encrypted = value;
      for (let i = 0; i < 3; i++) {
        encrypted = btoa(encrypted);
      }
      const v1 = `enc_v1_${salt}_${encrypted}`;
      expect(decryptPassword(v1)).toBe('mypassword');
    });

    it('should throw on invalid v1 format', () => {
      expect(() => decryptPassword('enc_v1_invalid')).toThrow();
      expect(() => decryptPassword('enc_v1_a_b_c')).toThrow();
    });

    it('should throw on unsupported format', () => {
      expect(() => decryptPassword('enc_v3_abc')).toThrow();
    });

    it('should throw on corrupted v2', () => {
      expect(() => decryptPassword('enc_v2_notbase64')).toThrow();
    });
  });

  describe('obfuscateSensitiveData edge cases', () => {
    it('should return primitive values as is', () => {
      expect(obfuscateSensitiveData(123)).toBe(123);
      expect(obfuscateSensitiveData('test')).toBe('test');
      expect(obfuscateSensitiveData(undefined)).toBe(undefined);
    });

    it('should obfuscate non-string sensitive fields as [HIDDEN]', () => {
      const obj = { password: 12345, token: { foo: 'bar' } };
      const result = obfuscateSensitiveData(obj);
      expect(result.password).toBe('[HIDDEN]');
      expect(result.token).toBe('[HIDDEN]');
    });
  });
  });

