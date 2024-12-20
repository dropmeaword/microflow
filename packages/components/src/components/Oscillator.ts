import { BaseComponent, BaseComponentOptions } from './BaseComponent';
/**
 * Function generator is a very versatile way of doing things in mcus
 * it can be used to control timing as well as values. For example a
 * square wave can be used to control on/off cycles of an LED at a
 * specific frequency. As well as values, such as using a
 * sine wave to control a fade value.
 *
 * Function generators can be compounded to produce interesting control signals.
 */
export type WaveformType = 'sinus' | 'square' | 'sawtooth' | 'triangle' | 'random';

export type OscillatorData = {
	waveform: WaveformType;
	period: number;
	amplitude: number;
	phase: number;
	shift: number;
	// autoStart?: boolean;
};
export type OscillatorValueType = number;

type OscillatorOptions = BaseComponentOptions & OscillatorData;

export class Oscillator extends BaseComponent<OscillatorValueType> {
	// auto-calculated values when "period" is reset
	private freq1 = 0;
	private freq2 = 0;
	private freq4 = 0;
	private freq0 = 0;

	// internal logic
	private started = 0;
	private lastTime = 0;
	private FRAMES_PER_SECOND = 60;
	private refreshRate = 1_000 / this.FRAMES_PER_SECOND;
	private timeout: NodeJS.Timeout | null = null;

	constructor(private readonly options: OscillatorOptions) {
		super(options, 0);

		this.freq1 = 1 / this.options.period;
		this.freq2 = 2 * this.freq1;
		this.freq4 = 4 * this.freq1;
		this.freq0 = 2 * Math.PI * this.freq1;

		this.start();
	}

	reset() {
		this.started = performance.now();
	}

	start() {
		this.stop();
		this.reset();
		this.started = this.ellapsed();
		this.timeout = setTimeout(this.loop.bind(this), this.refreshRate);
	}

	private sawtooth(t: number): number {
		let rv: number = 0;

		t += this.options.phase;
		if (t >= 0.0) {
			if (t >= this.options.period) t = t % this.options.period;
			rv = this.options.amplitude * (-1.0 + t * this.freq2);
		} else {
			t = -t;
			if (t >= this.options.period) t = t % this.options.period;
			rv = this.options.amplitude * (1.0 - t * this.freq2);
		}
		rv += this.options.shift;
		return rv;
	}

	private triangle(t: number): number {
		let rv: number = 0;

		t += this.options.phase;
		if (t < 0.0) {
			t = -t;
		}
		if (t >= this.options.period) t = t % this.options.period;
		if (t * 2 < this.options.period) {
			rv = this.options.amplitude * (-1.0 + t * this.freq4);
		} else {
			rv = this.options.amplitude * (3.0 - t * this.freq4);
		}
		rv += this.options.shift;
		return rv;
	}

	private square(t: number): number {
		let rv: number = 0;
		t += this.options.phase;
		if (t >= 0) {
			if (t >= this.options.period) t = t % this.options.period;
			if (t + t < this.options.period) rv = this.options.amplitude;
			else rv = -this.options.amplitude;
		} else {
			t = -t;
			if (t >= this.options.period) t = t % this.options.period;
			if (t * 2 < this.options.period) rv = -this.options.amplitude;
			else rv = this.options.amplitude;
		}
		rv += this.options.shift;
		return rv;
	}

	private sinus(t: number): number {
		let rv: number;
		t += this.options.phase;
		rv = this.options.amplitude * Math.sin(t * this.freq0);
		rv += this.options.shift;
		return rv;
	}

	private random(): number {
		return this.options.shift + this.options.amplitude * Math.random();
	}

	private ellapsed() {
		return performance.now() - this.started;
	}

	private loop() {
		const currentTime = this.ellapsed();

		switch (this.options.waveform) {
			case 'sinus': {
				this.value = this.sinus(currentTime);
				break;
			}
			case 'square': {
				this.value = this.square(currentTime);
				break;
			}
			case 'sawtooth': {
				this.value = this.sawtooth(currentTime);
				break;
			}
			case 'triangle': {
				this.value = this.triangle(currentTime);
				break;
			}
			case 'random': {
				this.value = this.random();
				break;
			}
		}

		// Schedule next update
		const nextUpdateTime = this.lastTime + this.refreshRate;
		const now = performance.now();
		const timeout = Math.max(0, nextUpdateTime - now);

		// console.log(`next update in ${timeout}ms`);
		this.lastTime = nextUpdateTime; // Update last time to the ideal time, not actual time
		this.timeout = setTimeout(this.loop.bind(this), timeout);
	}

	stop() {
		this.timeout && clearTimeout(this.timeout);
	}
}
