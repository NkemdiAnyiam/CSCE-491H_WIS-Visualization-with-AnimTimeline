import { AnimTimelineAnimation } from "./AnimBlock.js";
import { AnimSequence } from "./AnimSequence.js";

type AnimTimelineConfig = {
  debugMode: boolean;
};

type SequenceOperation = (sequence: AnimSequence) => void;

export class AnimTimeline {
  static id = 0;

  id; // used to uniquely identify this specific timeline
  animSequences: AnimSequence[] = []; // array of every AnimSequence in this timeline
  nextSeqIndex = 0; // index into animSequences
  isStepping = false;
  isSkipping = false; // used to determine whether or not all animations should be instantaneous
  isPaused = false;
  currDirection: 'forward' | 'backward' = 'forward'; // set to 'forward' after stepForward() or 'backward' after stepBackward()
  isAnimating = false; // true if currently in the middle of executing animations; false otherwise
  usingSkipTo = false; // true if currently using skipTo()
  playbackRate = 1;
  config: AnimTimelineConfig;
  // CHANGE NOTE: AnimTimeline now stores references to in-progress sequences and also does not act directly on individual animations
  inProgressSequences: Map<number, AnimSequence> = new Map();

  get numSequences(): number { return this.animSequences.length; }
  get atBeginning(): boolean { return this.nextSeqIndex === 0; }
  get atEnd(): boolean { return this.nextSeqIndex === this.numSequences; }

  constructor(config: Partial<AnimTimelineConfig & {animSequences: AnimSequence[]}> = {}) {
    this.id = AnimTimeline.id++;

    if (config.animSequences) {
      this.addSequences(...config.animSequences);
    }

    this.config = {
      debugMode: false,
      ...config,
    };
  }

  addSequences(...animSequences: AnimSequence[]): AnimTimeline {
    for(const animSequence of animSequences) {
      animSequence.parentTimeline = this;
      animSequence.setID(this.id);
    };
    this.animSequences.push(...animSequences);

    return this;
  }

  // CHANGE NOTE: sequences, and blocks now have base playback rates that are then compounded by parents
  setPlaybackRate(rate: number): AnimTimeline {
    this.playbackRate = rate;
    // set playback rates of currently running animations so that they don't continue to run at regular speed
    this.doForInProgressSequences(sequence => sequence.useCompoundedPlaybackRate());

    return this;
  }
  getPlaybackRate() { return this.playbackRate; }

  getCurrDirection() { return this.currDirection; }
  getIsStepping() { return this.isStepping; }
  getIsPaused() { return this.isPaused; }

  // steps forward or backward and does error-checking
  async step(direction: 'forward' | 'backward'): Promise<typeof direction> {
    if (this.isPaused) { throw new Error('Cannot step while playback is paused'); }
    if (this.isStepping) { throw new Error('Cannot step while already animating'); }
    this.isStepping = true;

    let continueOn;
    switch(direction) {
      case 'forward':
        // reject promise if trying to step forward at the end of the timeline
        if (this.atEnd) { return new Promise((_, reject) => {this.isStepping = false; reject('Cannot stepForward() at end of timeline')}); }
        do {continueOn = await this.stepForward();} while(continueOn);
        break;

      case 'backward':
        // reject promise if trying to step backward at the beginning of the timeline
        if (this.atBeginning) { return new Promise((_, reject) => {this.isStepping = false; reject('Cannot stepBackward() at beginning of timeline')}); }
        do {continueOn = await this.stepBackward();} while(continueOn);
        break;

      default:
        throw new Error(`Error: Invalid step direction '${direction}'. Must be 'forward' or 'backward'`);
    }

    // TODO: Potentially rewrite async/await syntax
    return new Promise(resolve => {
      this.isStepping = false;
      resolve(direction);
    });
  }

  // plays current AnimSequence and increments nextSeqIndex
  async stepForward(): Promise<boolean> {
    this.currDirection = 'forward';
    const sequences = this.animSequences;

    if (this.config.debugMode) { console.log(`-->> ${this.nextSeqIndex}: ${sequences[this.nextSeqIndex].getDescription()}`); }

    const toPlay = sequences[this.nextSeqIndex];
    this.inProgressSequences.set(toPlay.id, toPlay);
    await sequences[this.nextSeqIndex].play(); // wait for the current AnimSequence to finish all of its animations
    this.inProgressSequences.delete(toPlay.id);

    ++this.nextSeqIndex;
    const autoplayNext = !this.atEnd && (
      sequences[this.nextSeqIndex - 1].autoplaysNextSequence || // sequence that was just played
      sequences[this.nextSeqIndex].autoplays // new next sequence
    );

    return autoplayNext;
  }

  // decrements nextSeqIndex and rewinds the AnimSequence
  async stepBackward(): Promise<boolean> {
    this.currDirection = 'backward';
    const prevSeqIndex = --this.nextSeqIndex;
    const sequences = this.animSequences;

    if (this.config.debugMode) { console.log(`<<-- ${prevSeqIndex}: ${sequences[prevSeqIndex].getDescription()}`); }

    const toRewind = sequences[prevSeqIndex];
    this.inProgressSequences.set(toRewind.id, toRewind);
    await sequences[prevSeqIndex].rewind();
    this.inProgressSequences.delete(toRewind.id);
    
    const autorewindPrevious = !this.atBeginning && (
      sequences[prevSeqIndex - 1].autoplaysNextSequence || // new prev sequence
      sequences[prevSeqIndex].autoplays // sequence that was just rewound
    );

    return autorewindPrevious;
  }

  // immediately skips to first AnimSequence in animSequences with matching tag field
  async skipTo(tag: string, offset: number = 0): Promise<void> {
    if (this.isStepping) { throw new Error('Cannot use skipTo() while currently animating'); }
    // Calls to skipTo() must be separated using await or something that similarly prevents simultaneous execution of code
    if (this.usingSkipTo) { throw new Error('Cannot perform simultaneous calls to skipTo() in timeline'); }
    if (!Number.isSafeInteger(offset)) { throw new Error(`Invalid offset "${offset}". Value must be an integer.`); }

    // get nextSeqIndex corresponding to matching AnimSequence
    const tagIndex = this.animSequences.findIndex(animSequence => animSequence.getTag() === tag) + offset;
    if (tagIndex - offset === -1) { throw new Error(`Tag name "${tag}" not found`); }
    if (tagIndex < 0 || tagIndex  > this.numSequences)
      { throw new Error(`Skipping to tag "${tag}" with offset "${offset}" goes out of timeline bounds`); }

    this.usingSkipTo = true;
    let wasPaused = this.isPaused; // if paused, then unpause to perform the skipping; then pause
    // keep skipping forwards or backwards depending on direction of nextSeqIndex
    if (wasPaused) { this.togglePause(); }
    if (this.nextSeqIndex <= tagIndex)
      { while (this.nextSeqIndex < tagIndex) { await this.stepForward(); } } // could be <= to play the sequence as well
    else
      { while (this.nextSeqIndex > tagIndex) { await this.stepBackward(); } } // could be tagIndex+1 to prevent the sequence from being undone
    if (wasPaused) { this.togglePause(); }

    this.usingSkipTo = false;
  }

  toggleSkipping(isSkipping?: boolean): boolean {
    this.isSkipping = isSkipping ?? !this.isSkipping;
    // if skipping is enabled in the middle of animating, force currently running AnimSequence to finish
    if (this.isSkipping && this.isStepping && !this.isPaused) { this.skipInProgressSequences(); }
    return this.isSkipping;
  }

  skipInProgressSequences(): void { this.doForInProgressSequences(sequence => sequence.skipInProgressAnimations()); }
  // tells the current AnimSequence to instantly finish its animations

  // pauses or unpauses playback
  togglePause(isPaused?: boolean): boolean {
    this.isPaused = isPaused ?? !this.isPaused;
    if (this.isPaused) {
      this.doForInProgressSequences(sequence => sequence.pause());
    }
    else {
      this.doForInProgressSequences(sequence => sequence.unpause());
      if (this.isSkipping) { this.skipInProgressSequences(); }
    }
    return this.isPaused;
  }

  // get all currently running animations that belong to this timeline and perform operation() with them
  doForInProgressSequences(operation: SequenceOperation): void {
    for (const sequence of this.inProgressSequences.values()) {
      operation(sequence);
    }
  }
}