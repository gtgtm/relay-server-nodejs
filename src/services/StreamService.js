const { Device, StreamingSession, ActivityLog } = require('../models');
const constants = require('../config/constants');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

class StreamService {
  constructor() {
    // In-memory frame storage (MJPEG frame buffer)
    this.frameBuffer = new Map(); // cameraId -> { data, timestamp, modTime }

    // Audio chunk buffer (ring buffer per camera)
    this.audioBuffer = new Map(); // cameraId_type -> { chunks, currentIndex }

    // Ensure storage directories exist
    this.ensureStorageDirs();
  }

  ensureStorageDirs() {
    const dirs = ['./data', './data/frames', './data/audio'];
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Register a camera device (iOS app calls /api/camera/register)
   * @param {string} name - Camera name
   * @returns {object} - { cameraId }
   */
  async registerCamera(name) {
    // Generate 8-character hex ID (matching PHP implementation)
    const cameraId = Math.random().toString(16).slice(2, 10);

    logger.info(`Registered camera: ${cameraId} (${name})`);
    return { cameraId };
  }

  /**
   * Push frame from camera
   * @param {string} cameraId - Camera ID
   * @param {Buffer} frameData - JPEG data
   */
  async pushFrame(cameraId, frameData) {
    if (!frameData || frameData.length === 0) {
      throw new Error('Empty frame');
    }

    if (frameData.length > constants.MAX_FRAME_SIZE) {
      throw new Error(`Frame exceeds max size of ${constants.MAX_FRAME_SIZE}`);
    }

    // Store in memory
    this.frameBuffer.set(cameraId, {
      data: frameData,
      timestamp: Date.now(),
      modTime: Date.now(),
    });

    // Also store to disk for persistence
    const frameFile = path.join('./data/frames', `${cameraId}.jpg`);
    fs.writeFileSync(frameFile, frameData);

    logger.debug(`Frame pushed for camera ${cameraId} (${frameData.length} bytes)`);

    // Update device last seen
    await Device.update({ lastSeenAt: new Date() }, { where: { cameraId } });

    return { ok: true };
  }

  /**
   * Get current frame for MJPEG streaming
   * @param {string} cameraId - Camera ID
   */
  getFrame(cameraId) {
    return this.frameBuffer.get(cameraId);
  }

  /**
   * Push audio chunk from camera
   * @param {string} cameraId - Camera ID
   * @param {Buffer} audioData - Raw audio data
   * @param {string} type - 'cam' or 'talk'
   */
  async pushAudio(cameraId, audioData, type = 'cam') {
    if (!audioData || audioData.length === 0) {
      throw new Error('Empty audio');
    }

    const key = `${cameraId}_${type}`;

    // Initialize buffer if needed
    if (!this.audioBuffer.has(key)) {
      this.audioBuffer.set(key, {
        chunks: new Array(constants.AUDIO_BUFFER_SIZE).fill(null),
        currentIndex: 0,
      });
    }

    const buffer = this.audioBuffer.get(key);
    buffer.currentIndex = (buffer.currentIndex + 1) % constants.AUDIO_BUFFER_SIZE;
    buffer.chunks[buffer.currentIndex] = {
      data: audioData,
      timestamp: Date.now(),
    };

    // Also persist to disk
    const audioDir = path.join('./data/audio');
    const audioFile = path.join(audioDir, `${cameraId}_${type}_${buffer.currentIndex}.raw`);
    fs.writeFileSync(audioFile, audioData);

    logger.debug(`Audio chunk pushed for camera ${cameraId}/${type}`);

    return { ok: true };
  }

  /**
   * Get audio chunks since index (polling)
   * @param {string} cameraId - Camera ID
   * @param {number} sinceIndex - Last received index
   * @param {string} type - 'cam' or 'talk'
   */
  getAudio(cameraId, sinceIndex, type = 'cam') {
    const key = `${cameraId}_${type}`;

    // If no buffer yet, return -1
    if (!this.audioBuffer.has(key)) {
      return { index: -1, audio: null };
    }

    const buffer = this.audioBuffer.get(key);
    const currentIndex = buffer.currentIndex;

    // No new audio yet
    if (currentIndex <= sinceIndex) {
      return { index: currentIndex, audio: null };
    }

    // Get the audio chunk
    const chunk = buffer.chunks[currentIndex];
    if (!chunk) {
      return { index: currentIndex, audio: null };
    }

    return {
      index: currentIndex,
      audio: chunk.data.toString('base64'),
    };
  }

  /**
   * Clean stale cameras (no heartbeat in CAMERA_TIMEOUT seconds)
   */
  async cleanStaleCameras() {
    const timeout = new Date(Date.now() - constants.CAMERA_TIMEOUT * 1000);

    const staleDevices = await Device.findAll({
      where: {
        role: 'camera',
        lastSeenAt: { [require('sequelize').Op.lt]: timeout },
      },
    });

    for (const device of staleDevices) {
      logger.info(`Removing stale camera: ${device.cameraId}`);

      // Clean up files
      const frameFile = path.join('./data/frames', `${device.cameraId}.jpg`);
      if (fs.existsSync(frameFile)) {
        fs.unlinkSync(frameFile);
      }

      // Clean audio files
      const audioDir = path.join('./data/audio');
      if (fs.existsSync(audioDir)) {
        const files = fs.readdirSync(audioDir);
        files.forEach((file) => {
          if (file.startsWith(device.cameraId)) {
            fs.unlinkSync(path.join(audioDir, file));
          }
        });
      }

      // Clean from memory
      this.frameBuffer.delete(device.cameraId);
      this.audioBuffer.delete(`${device.cameraId}_cam`);
      this.audioBuffer.delete(`${device.cameraId}_talk`);

      // Mark device as inactive
      await Device.update({ streamActive: false }, { where: { cameraId: device.cameraId } });
    }
  }

  /**
   * Get list of all cameras
   */
  async getCameras() {
    const cameras = await Device.findAll({
      where: { role: 'camera' },
      attributes: ['cameraId', 'name', 'streamActive', 'lastSeenAt'],
    });

    return cameras.map((cam) => ({
      cameraId: cam.cameraId,
      name: cam.name,
      streamActive: cam.streamActive,
      lastSeen: cam.lastSeenAt ? cam.lastSeenAt.getTime() / 1000 : 0,
    }));
  }

  /**
   * Update camera stream status
   */
  async updateStreamStatus(cameraId, streaming) {
    const device = await Device.findOne({ where: { cameraId } });

    if (!device) {
      throw new Error('Camera not found');
    }

    if (streaming === true) {
      device.streamActive = true;
      device.lastSeenAt = new Date();
      await device.save();
      return { status: 'streaming' };
    } else if (streaming === false) {
      device.streamActive = false;
      await device.save();

      // Clean up frame
      const frameFile = path.join('./data/frames', `${cameraId}.jpg`);
      if (fs.existsSync(frameFile)) {
        fs.unlinkSync(frameFile);
      }

      this.frameBuffer.delete(cameraId);

      return { status: 'stopped' };
    }

    // Just return status
    return {
      status: device.streamActive ? 'streaming' : 'stopped',
      lastSeen: device.lastSeenAt ? device.lastSeenAt.getTime() / 1000 : 0,
    };
  }

  /**
   * Delete a camera
   */
  async deleteCamera(cameraId) {
    const device = await Device.findOne({ where: { cameraId } });

    if (device) {
      // Clean up files
      const frameFile = path.join('./data/frames', `${cameraId}.jpg`);
      if (fs.existsSync(frameFile)) {
        fs.unlinkSync(frameFile);
      }

      const audioDir = path.join('./data/audio');
      if (fs.existsSync(audioDir)) {
        const files = fs.readdirSync(audioDir);
        files.forEach((file) => {
          if (file.startsWith(cameraId)) {
            fs.unlinkSync(path.join(audioDir, file));
          }
        });
      }

      // Remove from memory
      this.frameBuffer.delete(cameraId);
      this.audioBuffer.delete(`${cameraId}_cam`);
      this.audioBuffer.delete(`${cameraId}_talk`);

      // Delete device
      await device.destroy();
    }

    return { status: 'removed' };
  }
}

module.exports = new StreamService();
