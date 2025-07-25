import { EventEmitter } from '../core/EventEmitter';
export class MetricsManager extends EventEmitter {
    constructor() {
        super(...arguments);
        this.metrics = {
            noiseReductionLevel: 0,
            processingLatency: 0,
            inputLevel: 0,
            outputLevel: 0,
            timestamp: Date.now(),
            frameCount: 0,
            droppedFrames: 0,
        };
        this.frameTimestamps = [];
        this.maxFrameHistory = 100;
        this.vadHistory = [];
        this.currentVAD = 0;
    }
    startAutoUpdate(intervalMs = 100) {
        this.stopAutoUpdate();
        this.updateInterval = setInterval(() => {
            this.calculateLatency();
            this.emit('metrics-update', { ...this.metrics });
        }, intervalMs);
    }
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }
    updateInputLevel(level) {
        this.metrics.inputLevel = Math.max(0, Math.min(1, level));
    }
    updateOutputLevel(level) {
        this.metrics.outputLevel = Math.max(0, Math.min(1, level));
    }
    updateNoiseReduction(level) {
        this.metrics.noiseReductionLevel = Math.max(0, Math.min(100, level));
    }
    recordFrame(timestamp = Date.now()) {
        this.frameTimestamps.push(timestamp);
        if (this.frameTimestamps.length > this.maxFrameHistory) {
            this.frameTimestamps.shift();
        }
        this.metrics.frameCount++;
        this.metrics.timestamp = timestamp;
    }
    recordDroppedFrame() {
        this.metrics.droppedFrames++;
    }
    recordChunk(chunk) {
        this.emit('chunk-processed', chunk);
    }
    calculateLatency() {
        if (this.frameTimestamps.length < 2) {
            this.metrics.processingLatency = 0;
            return;
        }
        const deltas = [];
        for (let i = 1; i < this.frameTimestamps.length; i++) {
            deltas.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
        }
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        this.metrics.processingLatency = avgDelta;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    reset() {
        this.metrics = {
            noiseReductionLevel: 0,
            processingLatency: 0,
            inputLevel: 0,
            outputLevel: 0,
            timestamp: Date.now(),
            frameCount: 0,
            droppedFrames: 0,
        };
        this.frameTimestamps = [];
    }
    calculateRMS(samples) {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
    }
    calculatePeak(samples) {
        let peak = 0;
        for (let i = 0; i < samples.length; i++) {
            peak = Math.max(peak, Math.abs(samples[i]));
        }
        return peak;
    }
    updateVAD(vad) {
        this.currentVAD = vad;
        this.vadHistory.push(vad);
        if (this.vadHistory.length > this.maxFrameHistory) {
            this.vadHistory.shift();
        }
    }
    getAverageVAD() {
        if (this.vadHistory.length === 0)
            return 0;
        return this.vadHistory.reduce((a, b) => a + b, 0) / this.vadHistory.length;
    }
    getVoiceActivityPercentage() {
        if (this.vadHistory.length === 0)
            return 0;
        const voiceFrames = this.vadHistory.filter(v => v > 0.5).length;
        return (voiceFrames / this.vadHistory.length) * 100;
    }
}
