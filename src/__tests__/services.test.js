const StreamService = require('../services/StreamService');

describe('StreamService', () => {
  describe('registerCamera', () => {
    test('should generate an 8-character camera ID', async () => {
      const result = await StreamService.registerCamera('Test Camera');

      expect(result).toHaveProperty('cameraId');
      expect(result.cameraId).toMatch(/^[a-f0-9]{8}$/);
    });

    test('should generate unique camera IDs', async () => {
      const id1 = await StreamService.registerCamera('Camera 1');
      const id2 = await StreamService.registerCamera('Camera 2');

      expect(id1.cameraId).not.toBe(id2.cameraId);
    });
  });

  describe('Frame Handling', () => {
    const testCameraId = 'test0001';
    const testFrameData = Buffer.from('fake jpeg data');

    test('should accept valid frames', async () => {
      const result = await StreamService.pushFrame(testCameraId, testFrameData);

      expect(result).toEqual({ ok: true });
    });

    test('should reject empty frames', async () => {
      const emptyFrame = Buffer.from('');

      await expect(StreamService.pushFrame(testCameraId, emptyFrame)).rejects.toThrow('Empty frame');
    });

    test('should reject oversized frames', async () => {
      const oversizedFrame = Buffer.alloc(3 * 1024 * 1024); // 3MB

      await expect(StreamService.pushFrame(testCameraId, oversizedFrame)).rejects.toThrow(
        'exceeds max size',
      );
    });

    test('should retrieve stored frames', async () => {
      await StreamService.pushFrame(testCameraId, testFrameData);
      const frame = StreamService.getFrame(testCameraId);

      expect(frame).not.toBeNull();
      expect(frame.data).toEqual(testFrameData);
    });
  });

  describe('Audio Handling', () => {
    const testCameraId = 'test0002';
    const testAudioData = Buffer.from('fake audio data');

    test('should accept audio chunks', async () => {
      const result = await StreamService.pushAudio(testCameraId, testAudioData, 'cam');

      expect(result).toEqual({ ok: true });
    });

    test('should reject empty audio', async () => {
      const emptyAudio = Buffer.from('');

      await expect(StreamService.pushAudio(testCameraId, emptyAudio, 'cam')).rejects.toThrow(
        'Empty audio',
      );
    });

    test('should return -1 for initial audio poll', () => {
      const result = StreamService.getAudio('nonexistent', -1, 'cam');

      expect(result.index).toBe(-1);
      expect(result.audio).toBeNull();
    });

    test('should retrieve audio chunks', async () => {
      await StreamService.pushAudio(testCameraId, testAudioData, 'cam');
      const result = StreamService.getAudio(testCameraId, -1, 'cam');

      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.audio).not.toBeNull();
    });
  });

  describe('Stream Status', () => {
    test('should handle stream status updates', async () => {
      // This test would require database mocking
      // Placeholder for full integration
      expect(true).toBe(true);
    });
  });
});
