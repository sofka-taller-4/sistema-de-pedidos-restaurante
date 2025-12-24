import { decryptPassword, isEncryptedPassword, obfuscateSensitiveData, secureLog } from '../../utils/security';

describe('security.ts', () => {
  describe('decryptPassword', () => {
    describe('v2 format (enc_v2_)', () => {
      it('should decrypt v2 format password correctly', () => {
        // Create a v2 encrypted password: timestamp:password:timestamp
        const timestamp = '1234567890';
        const password = 'myPassword123';
        const plaintext = `${timestamp}:${password}:${timestamp}`;
        
        // Encode: base64 -> base64 -> base64
        let encoded = Buffer.from(plaintext).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        
        const encrypted = `enc_v2_${encoded}`;
        
        const result = decryptPassword(encrypted);
        expect(result).toBe(password);
      });

      it('should handle v2 format with special characters', () => {
        const timestamp = '1234567890';
        const password = 'p@ssw0rd!#$%';
        const plaintext = `${timestamp}:${password}:${timestamp}`;
        
        let encoded = Buffer.from(plaintext).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        
        const encrypted = `enc_v2_${encoded}`;
        
        const result = decryptPassword(encrypted);
        expect(result).toBe(password);
      });

      it('should throw error for invalid v2 format (mismatched timestamps)', () => {
        const plaintext = '1234567890:password:9876543210';
        
        let encoded = Buffer.from(plaintext).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        
        const encrypted = `enc_v2_${encoded}`;
        
        expect(() => decryptPassword(encrypted)).toThrow('Failed to decrypt password');
      });

      it('should throw error for invalid v2 format (wrong number of parts)', () => {
        const plaintext = 'password:only:two:parts';
        
        let encoded = Buffer.from(plaintext).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        
        const encrypted = `enc_v2_${encoded}`;
        
        expect(() => decryptPassword(encrypted)).toThrow('Failed to decrypt password');
      });
    });

    describe('v1 format (enc_v1_)', () => {
      it('should decrypt v1 format password correctly', () => {
        const salt = 'salt123';
        const password = 'myPassword';
        const plaintext = `${salt}${password}${salt.split('').reverse().join('')}`;
        
        let encoded = Buffer.from(plaintext).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        
        const encrypted = `enc_v1_${salt}_${encoded}`;
        
        const result = decryptPassword(encrypted);
        expect(result).toBe(password);
      });

      it('should handle v1 format with special characters', () => {
        const salt = 'abc';
        const password = 'p@ss!';
        const plaintext = `${salt}${password}${salt.split('').reverse().join('')}`;
        
        let encoded = Buffer.from(plaintext).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        encoded = Buffer.from(encoded).toString('base64');
        
        const encrypted = `enc_v1_${salt}_${encoded}`;
        
        const result = decryptPassword(encrypted);
        expect(result).toBe(password);
      });

      it('should throw error for invalid v1 format (wrong number of parts)', () => {
        const encrypted = 'enc_v1_invalid_format_with_too_many_parts';
        
        expect(() => decryptPassword(encrypted)).toThrow('Failed to decrypt password');
      });

      it('should throw error for v1 format with only one part', () => {
        const encrypted = 'enc_v1_onlyonepart';
        
        expect(() => decryptPassword(encrypted)).toThrow('Failed to decrypt password');
      });
    });

    describe('unsupported formats', () => {
      it('should throw error for unsupported format', () => {
        expect(() => decryptPassword('unsupported_format')).toThrow('Failed to decrypt password');
      });

      it('should throw error for empty string', () => {
        expect(() => decryptPassword('')).toThrow('Failed to decrypt password');
      });

      it('should throw error for plain text password', () => {
        expect(() => decryptPassword('plainPassword')).toThrow('Failed to decrypt password');
      });
    });

    describe('error handling', () => {
      it('should throw error for corrupted v2 base64', () => {
        const encrypted = 'enc_v2_!!!invalid_base64!!!';
        
        expect(() => decryptPassword(encrypted)).toThrow('Failed to decrypt password');
      });

      it('should throw error for corrupted v1 base64', () => {
        const encrypted = 'enc_v1_salt_!!!invalid_base64!!!';
        
        expect(() => decryptPassword(encrypted)).toThrow('Failed to decrypt password');
      });
    });
  });

  describe('isEncryptedPassword', () => {
    it('should return true for v1 encrypted password', () => {
      expect(isEncryptedPassword('enc_v1_salt_encoded')).toBe(true);
    });

    it('should return true for v2 encrypted password', () => {
      expect(isEncryptedPassword('enc_v2_encoded')).toBe(true);
    });

    it('should return false for plain text password', () => {
      expect(isEncryptedPassword('plainPassword')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncryptedPassword('')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isEncryptedPassword(null as any)).toBe(false);
      expect(isEncryptedPassword(undefined as any)).toBe(false);
      expect(isEncryptedPassword(123 as any)).toBe(false);
    });

    it('should return false for similar but different prefix', () => {
      expect(isEncryptedPassword('enc_v3_something')).toBe(false);
      expect(isEncryptedPassword('encrypted_v1_something')).toBe(false);
    });
  });

  describe('obfuscateSensitiveData', () => {
    it('should hide password field', () => {
      const data = { email: 'test@example.com', password: 'secret123' };
      const result = obfuscateSensitiveData(data);
      
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('[HIDDEN]');
    });

    it('should hide passwordHash field', () => {
      const data = { email: 'test@example.com', passwordHash: 'hash123' };
      const result = obfuscateSensitiveData(data);
      
      expect(result.email).toBe('test@example.com');
      expect(result.passwordHash).toBe('[HIDDEN]');
    });

    it('should hide token field', () => {
      const data = { userId: '123', token: 'jwt_token_here' };
      const result = obfuscateSensitiveData(data);
      
      expect(result.userId).toBe('123');
      expect(result.token).toBe('[HIDDEN]');
    });

    it('should hide refreshToken field', () => {
      const data = { userId: '123', refreshToken: 'refresh_token_here' };
      const result = obfuscateSensitiveData(data);
      
      expect(result.userId).toBe('123');
      expect(result.refreshToken).toBe('[HIDDEN]');
    });

    it('should hide multiple sensitive fields', () => {
      const data = {
        email: 'test@example.com',
        password: 'secret123',
        passwordHash: 'hash123',
        token: 'jwt_token',
        refreshToken: 'refresh_token'
      };
      const result = obfuscateSensitiveData(data);
      
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('[HIDDEN]');
      expect(result.passwordHash).toBe('[HIDDEN]');
      expect(result.token).toBe('[HIDDEN]');
      expect(result.refreshToken).toBe('[HIDDEN]');
    });

    it('should not modify non-string sensitive fields', () => {
      const data = { password: null, token: undefined, refreshToken: 123 };
      const result = obfuscateSensitiveData(data);
      
      expect(result.password).toBe(null);
      expect(result.token).toBe(undefined);
      expect(result.refreshToken).toBe(123);
    });

    it('should handle null input', () => {
      expect(obfuscateSensitiveData(null)).toBe(null);
    });

    it('should handle undefined input', () => {
      expect(obfuscateSensitiveData(undefined)).toBe(undefined);
    });

    it('should handle non-object input', () => {
      expect(obfuscateSensitiveData('string')).toBe('string');
      expect(obfuscateSensitiveData(123)).toBe(123);
      expect(obfuscateSensitiveData(true)).toBe(true);
    });

    it('should not modify original object', () => {
      const original = { email: 'test@example.com', password: 'secret123' };
      const result = obfuscateSensitiveData(original);
      
      expect(original.password).toBe('secret123');
      expect(result.password).toBe('[HIDDEN]');
    });

    it('should handle nested objects (shallow copy)', () => {
      const data = {
        user: { email: 'test@example.com' },
        password: 'secret123'
      };
      const result = obfuscateSensitiveData(data);
      
      expect(result.password).toBe('[HIDDEN]');
      expect(result.user).toBe(data.user);
    });
  });

  describe('secureLog', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    describe('info', () => {
      it('should log message without data', () => {
        secureLog.info('Test message');
        
        expect(consoleLogSpy).toHaveBeenCalledWith('Test message', '');
      });

      it('should log message with data', () => {
        const data = { email: 'test@example.com', name: 'Test' };
        secureLog.info('User data', data);
        
        expect(consoleLogSpy).toHaveBeenCalled();
        const callArgs = consoleLogSpy.mock.calls[0];
        expect(callArgs[0]).toBe('User data');
        expect(callArgs[1]).toEqual(data);
      });

      it('should obfuscate sensitive data in info logs', () => {
        const data = { email: 'test@example.com', password: 'secret123' };
        secureLog.info('User data', data);
        
        expect(consoleLogSpy).toHaveBeenCalled();
        const callArgs = consoleLogSpy.mock.calls[0];
        expect(callArgs[1].password).toBe('[HIDDEN]');
      });
    });

    describe('error', () => {
      it('should log error message without error object', () => {
        secureLog.error('Error occurred');
        
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred', undefined);
      });

      it('should log error message with error object', () => {
        const error = new Error('Test error');
        secureLog.error('Error occurred', error);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred', 'Test error');
      });

      it('should log error message with error string', () => {
        secureLog.error('Error occurred', 'Error message');
        
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred', 'Error message');
      });

      it('should handle error without message property', () => {
        const error = { custom: 'error' };
        secureLog.error('Error occurred', error);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred', error);
      });
    });

    describe('warn', () => {
      it('should log warning message without data', () => {
        secureLog.warn('Warning message');
        
        expect(consoleWarnSpy).toHaveBeenCalledWith('Warning message', '');
      });

      it('should log warning message with data', () => {
        const data = { email: 'test@example.com', name: 'Test' };
        secureLog.warn('Warning data', data);
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        const callArgs = consoleWarnSpy.mock.calls[0];
        expect(callArgs[0]).toBe('Warning data');
        expect(callArgs[1]).toEqual(data);
      });

      it('should obfuscate sensitive data in warn logs', () => {
        const data = { email: 'test@example.com', token: 'jwt_token' };
        secureLog.warn('User data', data);
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        const callArgs = consoleWarnSpy.mock.calls[0];
        expect(callArgs[1].token).toBe('[HIDDEN]');
      });
    });
  });
});
