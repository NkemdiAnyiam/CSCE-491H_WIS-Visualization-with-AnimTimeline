import { AnimBlock } from "./AnimBlock";
import { AnimTimeline } from "./AnimTimeline";

/* JUMPING TABLE OF CONTENTS */
() => {{
type a =
  AnimSequenceConfig

type b =
  AnimationOperation

AnimSequence;
}}




/**
 * This is the description of the interface
 *
 * @interface AnimSequenceConfig
 * @property {string} description — This string is logged when debugging mode is enabled.
 * @property {boolean} tag — This string can be used as an argument to AnimTimeline.prototype.skipTo().
 * @property {boolean} autoplaysNextSequence — If true, the next sequence in the timeline will automatically play after this sequence finishes.
 * @property {boolean} autoplays — If true, this sequence will automatically play after the previous sequence in the timeline finishes.
 */
type AnimSequenceConfig = {
  /**
   * This string is logged when debugging mode is enabled.
   * @optional
   * @defaultValue `'<blank sequence description>'`
   * 
  */
  description: string;

  /**
   * This string can be used as an argument to AnimTimeline.prototype.skipTo().
   * @defaultValue `''`
  */

  tag: string;

  /**
   * If true, the next sequence in the timeline will automatically play after this sequence finishes.
   * @defaultValue `false`
   * */
  autoplaysNextSequence: boolean;

  /**
   * If true, this sequence will automatically play after the previous sequence in the timeline finishes.
   * @defaultValue `false`
   * 
  */
  autoplays: boolean;
};

type AnimationOperation = (animation: AnimBlock) => void; 

export class AnimSequence implements AnimSequenceConfig {
  private static id = 0;
  
  id: number;
  timelineID: number = NaN; // set to match the id of the AnimTimeline to which it belongs
  parentTimeline?: AnimTimeline; // pointer to parent AnimTimeline
  description: string = '<blank sequence description>';
  tag: string = ''; // helps idenfity current AnimSequence for using AnimTimeline's skipTo()
  autoplaysNextSequence: boolean = false; // decides whether the next AnimSequence should automatically play after this one
  autoplays: boolean = false;
  basePlaybackRate: number = 1;
  isPaused = false;
  get compoundedPlaybackRate() { return this.basePlaybackRate * (this.parentTimeline?.playbackRate ?? 1); }
  private animBlocks: AnimBlock[] = []; // array of animBlocks

  private animBlockGroupings_activeFinishOrder: AnimBlock[][] = [];
  private animBlockGroupings_endDelayFinishOrder: AnimBlock[][] = [];
  private animBlockGroupings_backwardActiveFinishOrder: AnimBlock[][] = [];
  private animBlock_forwardGroupings: AnimBlock[][] = [[]];
  // CHANGE NOTE: AnimSequence now stores references to all in-progress blocks
  private inProgressBlocks: Map<number, AnimBlock> = new Map();

  constructor(config: Partial<AnimSequenceConfig> = {}) {
    this.id = AnimSequence.id++;

    Object.assign(this, config);
  }

  getDescription() { return this.description; }
  getTag() { return this.tag; }
  
  setDescription(description: string): AnimSequence { this.description = description; return this; }
  setTag(tag: string): AnimSequence { this.tag = tag; return this; }
  setID(id: number) {
    this.timelineID = id;
    for (const animBlock of this.animBlocks) {
      animBlock.setID(this.id, this.timelineID);
      animBlock.parentTimeline = this.parentTimeline;
      animBlock.parentSequence = this;
    }
  }

  // TODO: Review implementation
  addBlocks(...animBlocks: AnimBlock[]): AnimSequence {
    // CHANGE NOTE: removed addOneBlock()
    for (const animBlock of animBlocks) {
      animBlock.setID(this.id, this.timelineID);
      animBlock.parentTimeline = this.parentTimeline;
      animBlock.parentSequence = this;
    }
    this.animBlocks.push(...animBlocks);
    return this;
  }

  findBlockIndex(animBlock: AnimBlock): number {
    return this.animBlocks.findIndex((_animBlock) => _animBlock === animBlock);
  }

  // plays each animBlock contained in this AnimSequence instance in sequential order
  async play(): Promise<void> {
    this.commit();
    const activeGroupings = this.animBlockGroupings_activeFinishOrder;
    // const activeGroupings2 = this.animBlockGroupings_endDelayFinishOrder;
    const numGroupings = activeGroupings.length;

    for (let i = 0; i < numGroupings; ++i) {
      const activeGrouping = activeGroupings[i];
      // TODO: probably want to reincorporate this
      // const activeGrouping2 = activeGroupings2[i];
      const groupingLength = activeGrouping.length;

      // ensure that no block finishes its active phase before any block that should finish its active phase first (according to the calculated "perfect" timing)
      for (let j = 1; j < groupingLength; ++j) {
        activeGrouping[j].addIntegrityblocks('forward', 'activePhase', 'end', activeGrouping[j-1].generateTimePromise('forward', 'activePhase', 'end'));
        // activeGrouping2[j].animation.addIntegrityblocks('forward', 'endDelayPhase', 'end', activeGrouping2[j-1].animation.getFinished('forward', 'endDelayPhase'));
      }
    }

    let parallelBlocks: Promise<void>[] = [];
    for (let i = 0; i < this.animBlock_forwardGroupings.length; ++i) {
      parallelBlocks = [];
      const grouping = this.animBlock_forwardGroupings[i];
      const firstBlock = grouping[0];
      this.inProgressBlocks.set(firstBlock.id, firstBlock);
      parallelBlocks.push(firstBlock.play()
        .then(() => {this.inProgressBlocks.delete(firstBlock.id)})
      );

      for (let j = 1; j < grouping.length; ++j) {
        // the start of any block within a grouping should line up with the beginning of the preceding block's active phase
        // (akin to PowerPoint timing)
        await grouping[j-1].generateTimePromise('forward', 'activePhase', 'beginning');
        const currAnimBlock = grouping[j];
        this.inProgressBlocks.set(currAnimBlock.id, currAnimBlock);
        parallelBlocks.push(currAnimBlock.play()
          .then(() => {this.inProgressBlocks.delete(currAnimBlock.id)})
        );
      }
      await Promise.all(parallelBlocks);
    }
  }

  // rewinds each animBlock contained in this AnimSequence instance in reverse order
  async rewind(): Promise<void> {
    const activeGroupings = this.animBlockGroupings_backwardActiveFinishOrder;
    const numGroupings = activeGroupings.length;

    for (let i = 0; i < numGroupings; ++i) {
      const activeGrouping = activeGroupings[i];
      const groupingLength = activeGrouping.length;

      // ensure that no block finishes rewinding its active phase before any block that should finishing doing so first first (according to the calculated "perfect" timing)
      for (let j = 1; j < groupingLength; ++j) {
        activeGrouping[j].addIntegrityblocks('backward', 'activePhase', 'beginning', activeGrouping[j-1].generateTimePromise('backward', 'activePhase', 'beginning'));
      }
    }
    
    let parallelBlocks: Promise<void>[] = [];
    const groupings = this.animBlockGroupings_endDelayFinishOrder;
    const groupingsLength = groupings.length;
    for (let i = groupingsLength - 1; i >= 0; --i) {
      parallelBlocks = [];
      const grouping = groupings[i];
      const groupingLength = grouping.length;
      const lastBlock = grouping[groupingLength - 1];
      this.inProgressBlocks.set(lastBlock.id, lastBlock);
      parallelBlocks.push(lastBlock.rewind()
        .then(() => {this.inProgressBlocks.delete(lastBlock.id)})
      );

      for (let j = groupingLength - 2; j >= 0; --j) {
        const currAnimBlock = grouping[j];
        const nextAnimBlock = grouping[j + 1];
        // if the current block intersects the next block, wait for that intersection time
        if (currAnimBlock.fullFinishTime > nextAnimBlock.fullStartTime) {
          await nextAnimBlock.generateTimePromise('backward', 'whole', currAnimBlock.fullFinishTime - nextAnimBlock.fullStartTime);
        }
        // otherwise, wait for the next block to finish rewinding entirely
        else {
          await nextAnimBlock.generateTimePromise('backward', 'delayPhase', 'beginning');
        }

        // once waiting period above is over, begin rewinding current block
        this.inProgressBlocks.set(currAnimBlock.id, currAnimBlock);
        parallelBlocks.push(currAnimBlock.rewind()
          .then(() => {this.inProgressBlocks.delete(currAnimBlock.id)})
        );
      }
      await Promise.all(parallelBlocks);
    }
  }
  
  pause(): void {
    this.isPaused = true;
    this.doForInProgressBlocks(animBlock => animBlock.pause());
  }
  unpause(): void {
    this.isPaused = false;
    this.doForInProgressBlocks(animBlock => animBlock.unpause());
  }

  updatePlaybackRate(newRate: number) {
    this.basePlaybackRate = newRate;
    this.useCompoundedPlaybackRate();
  }

  useCompoundedPlaybackRate() {
    this.doForInProgressBlocks(animBlock => animBlock.useCompoundedPlaybackRate());
  }

  // used to skip currently running animation so they don't run at regular speed while using skipping
  skipInProgressAnimations(): void {
    this.doForInProgressBlocks(animBlock => animBlock.finish());
  }

  private static activeBackwardFinishComparator = (blockA: AnimBlock, blockB: AnimBlock) => blockB.activeStartTime - blockA.activeStartTime;
  private static activeFinishComparator = (blockA: AnimBlock, blockB: AnimBlock) => blockA.activeFinishTime - blockB.activeFinishTime;
  private static endDelayFinishComparator = (blockA: AnimBlock, blockB: AnimBlock) => blockA.fullFinishTime - blockB.fullFinishTime;

  // TODO: Complete this method
  commit(): AnimSequence {
    const {
      activeBackwardFinishComparator,
      activeFinishComparator,
      endDelayFinishComparator,
    } = AnimSequence;

    let maxFinishTime = 0;
    const animBlocks = this.animBlocks;
    const numBlocks = animBlocks.length;
    this.animBlock_forwardGroupings = [[]];
    this.animBlockGroupings_backwardActiveFinishOrder = [];
    this.animBlockGroupings_activeFinishOrder = [];
    this.animBlockGroupings_endDelayFinishOrder = [];
    let currActiveBackwardFinishGrouping: AnimBlock[] = [];
    let currActiveFinishGrouping: AnimBlock[] = [];
    let currEndDelayGrouping: AnimBlock[] = [];

    for (let i = 0; i < numBlocks; ++i) {
      const currAnimBlock = animBlocks[i];
      const prevBlock = animBlocks[i-1];
      const startsWithPrev = currAnimBlock.startsWithPrevious || prevBlock?.startsNextBlock;
      let currStartTime: number;

      if (startsWithPrev || i === 0) {
        // currActiveBackwardFinishGrouping.push(currAnimBlock);
        currActiveFinishGrouping.push(currAnimBlock);
        currEndDelayGrouping.push(currAnimBlock);

        currStartTime = prevBlock?.activeStartTime ?? 0;
      }
      else {
        this.animBlock_forwardGroupings.push([]);
        currActiveFinishGrouping.sort(activeFinishComparator);
        currEndDelayGrouping.sort(endDelayFinishComparator);
        currActiveBackwardFinishGrouping = [...currEndDelayGrouping].reverse();
        currActiveBackwardFinishGrouping.sort(activeBackwardFinishComparator);
        this.animBlockGroupings_backwardActiveFinishOrder.push(currActiveBackwardFinishGrouping);
        this.animBlockGroupings_activeFinishOrder.push(currActiveFinishGrouping);
        this.animBlockGroupings_endDelayFinishOrder.push(currEndDelayGrouping);
        currActiveBackwardFinishGrouping = [currAnimBlock];
        currActiveFinishGrouping = [currAnimBlock];
        currEndDelayGrouping = [currAnimBlock];

        currStartTime = maxFinishTime;
      }

      this.animBlock_forwardGroupings[this.animBlock_forwardGroupings.length - 1].push(currAnimBlock);

      currAnimBlock.fullStartTime = currStartTime;

      maxFinishTime = Math.max(currAnimBlock.fullFinishTime, maxFinishTime);
    }

    currActiveFinishGrouping.sort(activeFinishComparator);
    currEndDelayGrouping.sort(endDelayFinishComparator);
    currActiveBackwardFinishGrouping = [...currEndDelayGrouping].reverse();
    currActiveBackwardFinishGrouping.sort(activeBackwardFinishComparator);
    this.animBlockGroupings_backwardActiveFinishOrder.push(currActiveBackwardFinishGrouping);
    this.animBlockGroupings_activeFinishOrder.push(currActiveFinishGrouping);
    this.animBlockGroupings_endDelayFinishOrder.push(currEndDelayGrouping);

    return this;
  }

  // get all currently running animations that belong to this timeline and perform operation() with them
  private doForInProgressBlocks(operation: AnimationOperation): void {
    for (const animBlock of this.inProgressBlocks.values()) {
      operation(animBlock);
    }
  }
}
