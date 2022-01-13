import { AnimSequence } from "./AnimSequence.js";

export class AnimTimeline {
  static id = 0;

  id; // used to uniquely identify this specific timeline
  animSequences = []; // array of every AnimSequence in this timeline
  numSequences = 0;
  stepNum = 0; // index into animSequences
  isSkipping = false; // used to determine whether or not all animations should be instantaneous
  currDirection = 'forward'; // set to 'forward' after stepForward() or 'backward' after stepBackward()
  isAnimating = false; // true if currently in the middle of executing animations; false otherwise
  usingSkipTo = false; // true if currently using skipTo()

  constructor(animSequences = null, options = null) {
    this.id = AnimTimeline.id++;

    if (animSequences) {
      if (animSequences instanceof Array && (animSequences[0] instanceof AnimSequence || animSequences[0] instanceof Array)) {
        this.addSequences(animSequences);
        this.numSequences = this.animSequences.length;
      }
      else {
        this.addSequence(animSequences);
        this.numSequences = 1;
      }
    }

    this.debugMode = options ? (options?.debugMode ?? false) : false;
  }

  addOneSequence(animSequenceOrData) {
    if (animSequenceOrData instanceof AnimSequence) {
      animSequenceOrData.setID(this.id);
      this.animSequences.push(animSequenceOrData);
    }
    else {
      const newAnimSequence = new AnimSequence();
      if (animSequenceOrData[0] instanceof Array) { newAnimSequence.addManyBlocks(animSequenceOrData); }
      else { newAnimSequence.addOneBlock(animSequenceOrData); }
      newAnimSequence.setID(this.id);
      this.animSequences.push(newAnimSequence);
    }
    ++this.numSequences;
  }

  addManySequences(animSequences) {
    animSequences.forEach(animSequence => this.addOneSequence(animSequence));
  }

  // plays current AnimSequence and increments stepNum
  stepForward() {
    // if (this.isAnimating) { return Promise.reject('Cannot stepForward() while already animating'); }
    if (this.atEnd()) { return Promise.reject('Cannot stepForward() at end of timeline'); }

    this.isAnimating = true;
    this.currDirection = 'forward';

    if (this.debugMode) { console.log(`-->> ${this.animSequences[this.stepNum].getDescription()}`); }

    if (this.isSkipping) { this.fireSkipSignal(); }

    return new Promise(resolve => {
      this.animSequences[this.stepNum].play() // wait for the current AnimSequence to finish all of its animations
      .then(() => resolve());
    })
    .then(() => {
      ++this.stepNum;
      this.isAnimating = false;
    });
  }

  // decrements stepNum and rewinds the AnimSequence
  stepBackward() {
    // if (this.isAnimating) { return Promise.reject('Cannot stepBackward() while already animating'); }
    if (this.atBeginning()) { return Promise.reject('Cannot stepBackward() at beginning of timeline'); }

    this.isAnimating = true;
    --this.stepNum;
    this.currDirection = 'backward';

    if (this.debugMode) { console.log(`<<-- ${this.animSequences[this.stepNum].getDescription()}`); }

    if (this.isSkipping) { this.fireSkipSignal(); }

    return new Promise(resolve => {
      this.animSequences[this.stepNum].rewind()
      .then(() => resolve());
    })
    .then(() => {
      this.isAnimating = false;
      return Promise.resolve();
    });
  }

  // immediately skips to first AnimSequence in animSequences with matching tag field
  async skipTo(tag) {
    // Calls to skipTo() must be separated using await or something that similarly prevents simultaneous execution of code
    if (this.usingSkipTo) { return Promise.reject('Do not perform simultaneous calls to skipTo() in timeline'); }
    this.usingSkipTo = true;

    // get stepNum corresponding to matching AnimSequence
    const stepNumTo = this.animSequences.findIndex(animSequence => animSequence.getTag() === tag);

    // keep skipping forwards or backwards depending on direction of stepNum
    if (this.stepNum < stepNumTo) {
      while (this.stepNum < stepNumTo) {
        this.fireSkipSignal();
        await this.stepForward();
      }
    }
    else {
      while (this.stepNum > stepNumTo) {
        this.fireSkipSignal();
        await this.stepBackward();
      }
    }

    this.usingSkipTo = false;
    return Promise.resolve(tag);
  }

  toggleSkipping(isSkipping) {
    this.isSkipping = isSkipping ?? !this.isSkipping;
    if (this.isSkipping) {
      // if skipping is enabled in the middle of animating, force currently running AnimSequence to finish
      if (this.isAnimating) {
        this.fireSkipSignal();
        // the animation(s) actually running right now won't handle the skip signal, so maximize playback rate to force near instant completion instead
        this.fireRateSignal(Number.MAX_SAFE_INTEGER);
      }
    }
    return this.isSkipping;
  }

    // tells the current AnimSequence to instantly finish its animations
  fireSkipSignal() { this.animSequences[this.stepNum].fireSkipSignal(); }

  // sets the playbacks of all currently running animations that belong to this timeline
  fireRateSignal(rate) {
    const allAnimations = document.getAnimations();
    for (let i = 0; i < allAnimations.length; ++i) {
      // an animation "belongs" to this timeline if its id matches
      if (Number.parseInt(allAnimations[i].id) === this.id) { allAnimations[i].playbackRate = rate; }
    }
  }

  atBeginning() { return this.stepNum === 0; }
  atEnd() { return this.stepNum === this.numSequences; }
}
