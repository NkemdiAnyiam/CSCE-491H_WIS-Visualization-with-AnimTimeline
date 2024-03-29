import { setupPlaybackControls } from './playbackControls.js';
import { JobScheduler } from './JobScheduler.js';
import { SceneCreator } from './SceneCreator.js';
import { AnimBlock } from './AnimBlock.js';
import { AnimBlockLine } from './AnimBlockLine.js';
import { AnimSequence } from './AnimSequence.js';
import { AnimTimeline } from "./AnimTimeline.js";


const dataDisplay = document.querySelector('.data-display');
const animTimeline = new AnimTimeline(null, {debugMode: true});


export function generateVisualization (jobsUnsorted) {
  // fade-in visualization screen
  (function() {
    const fadeinVisualization = new AnimBlock(document.querySelector('.visualization'), 'fade-in', {duration: 375});
    fadeinVisualization.stepForward();
  })();

  // const jobsUnsorted = [
  //   new Job(5, 9, 7),
  //   new Job(8, 11, 5),
  //   new Job(0, 6, 2),
  //   new Job(1, 4, 1),
  //   new Job(3, 8, 5),
  //   new Job(4, 7, 4),
  //   new Job(6, 10, 3),
  //   new Job(3, 5, 6),
  // ];

  const jobScheduler = new JobScheduler();

  jobsUnsorted.forEach(job => jobScheduler.addJob(job));
  jobScheduler.performWISAlgorithm();

  const sceneCreator = new SceneCreator(jobScheduler);
  sceneCreator.generateScene();

  setUpDataDisplayScroll(dataDisplay);
  setUpFreeLinesArrows();
  animateDataDisplay(dataDisplay, jobScheduler);
  animateJobCard(document.querySelector('.job-card')); // naturally starts at the root job card
  setupPlaybackControls(animTimeline);
};

// allows the data display (left view with the time graph and arrays) to scroll horizontally
function setUpDataDisplayScroll (dataDisplay) {
  document.addEventListener('scroll', function(e) {
    dataDisplay.style.left = `${-window.scrollX}px`;
  });
};

// sets up the markers for free lines that are arrows
function setUpFreeLinesArrows() {
  const freeLineArrows = [...document.querySelectorAll('.free-line--arrow')];
  freeLineArrows.forEach((freeLine, i) => {
    const line = freeLine.querySelector('.free-line__line');
    const marker = freeLine.querySelector('marker');

    const id = `markerArrow--${i}`;
    marker.id = id;
    line.style.markerEnd = `url(#${id})`;
  });
};

// creates animation sequences for the data display
function animateDataDisplay(dataDisplay, jobScheduler) {
  const timeGraphEl = document.querySelector('.time-graph');
  const jobsUnsorted = jobScheduler.getJobsUnsorted();
  const jobsSorted = jobScheduler.getJobs();


  const textbox_placeBars = dataDisplay.querySelector('.text-box-line-group--place-bars .text-box');
  const freeLine_placeBars = dataDisplay.querySelector('.text-box-line-group--place-bars .free-line');
  const textP_placeBars_unorder = textbox_placeBars.querySelector('.text-box__paragraph--unorder');
  const textP_placeBars_unorder2 = textbox_placeBars.querySelector('.text-box__paragraph--unorder-2');
  const textP_placeBars_order = textbox_placeBars.querySelector('.text-box__paragraph--order');
  const textP_placeBars_ordered = textbox_placeBars.querySelector('.text-box__paragraph--ordered');

  /****************************************************** */
  // DESCRIBE THAT WE'RE ABOUT TO MOVE BARS ONTO GRAPH
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription(`Describe that we're about to move bars onto graph`);
    animSequence.addManyBlocks([
      [ 'line', freeLine_placeBars, 'enter-wipe-from-bottom', null, [0.5, 1], jobsUnsorted[0].getJobBar(), [0.5, 0] ],
      [ 'std', textbox_placeBars, 'fade-in', {blocksPrev: false} ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }

  /****************************************************** */
  // MOVE JOB BARS ONTO TIME GRAPH IN UNSORTED ORDER
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Move job bars onto time graph in unsorted order');
    animSequence.addOneBlock(new AnimBlockLine(freeLine_placeBars, 'exit-wipe-to-top', null, [0.5, 1], jobsUnsorted[0].getJobBar(), [0.5, 0], {blocksNext: false}));
    jobsUnsorted.forEach((job) => {
      const jobBarEl = job.getJobBar();
      // set up options for moving job bars to correct location
      const jobLetter = jobBarEl.dataset.jobletter;
      const startCell = document.querySelector(`.time-graph__row[data-jobletterunsorted="${jobLetter}"]  .time-graph__cell--${jobBarEl.dataset.start}`);
      const options = { translateOptions: { targetElem: startCell } };
      animSequence.addOneBlock(new AnimBlock(jobBarEl, 'translate', options));
    });
    animSequence.addManyBlocks([
      [ 'std', textP_placeBars_unorder, 'fade-out', {duration: 250} ],
      [ 'std', textP_placeBars_unorder2, 'fade-in', {duration: 250} ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // MOVE JOB BARS BACK OFF OF THE TIME GRAPH
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Move job bars back off of the time graph');
    animSequence.addManyBlocks([
      [ 'std', textP_placeBars_unorder2, 'fade-out', {duration: 250} ],
      [ 'std', textP_placeBars_order, 'fade-in', {duration: 250} ],
    ]);
    const jobBarsInitialArea = document.querySelector('.time-graph__job-bars');
    jobsUnsorted.forEach((job) => {
      const jobBarEl = job.getJobBar();
      const options = {blocksPrev: false, blocksNext: false, translateOptions: { targetElem: jobBarsInitialArea } };
      animSequence.addOneBlock(new AnimBlock(jobBarEl, 'translate', options));
    });

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // MOVE JOB BARS BACK ONTO THE TIME GRAPH (SORTED BY FINISH TIME) AND UPDATE TIME GRAPH ROW HEADERS
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Move job bars back onto the time graph (sorted by finish time) and update time graph row headers');
    jobsSorted.forEach((job) => {
      const jobBarEl = job.getJobBar();
      // set up options for moving job bars to correct location
      const jobLetter = jobBarEl.dataset.jobletter;
      const row = document.querySelector(`.time-graph__row[data-joblettersorted="${jobLetter}"]`);
      const startCell = row.querySelector(`.time-graph__cell--${jobBarEl.dataset.start}`);
      
      // get row's header data to animate
      const rowSJNum = row.querySelector('.time-graph__SJ-num');
      const rowUnsortedLetter = row.querySelector('.time-graph__job-letter--unsorted');
      const rowSortedLetter = row.querySelector('.time-graph__job-letter--sorted');
      
      animSequence.addManyBlocks([
        [ 'std', jobBarEl, 'translate', { blocksNext: false, translateOptions: { targetElem: startCell } } ],
        [ 'std', rowUnsortedLetter, 'exit-wipe-to-left', {blocksPrev: false, duration: 250} ],
        [ 'std', rowSJNum, 'enter-wipe-from-right', {blocksNext: false, blocksPrev: false, duration: 250} ],
        [ 'std', rowSortedLetter, 'enter-wipe-from-right', {blocksPrev: false, duration: 250} ],
      ]);
    });

    animSequence.addManyBlocks([
      [ 'std', textP_placeBars_order, 'fade-out', {duration: 250} ],
      [ 'std', textP_placeBars_ordered, 'fade-in', {duration: 250} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  const arrayGroup_j_c = dataDisplay.querySelector('.array-group--j-and-c');
  const cArray = arrayGroup_j_c.querySelector('.array--c');
  const jArray1 = arrayGroup_j_c.querySelector('.array--j');
  const textbox_cArray = dataDisplay.querySelector('.text-box-line-group--c-array .text-box');
  const freeLine_cArray = dataDisplay.querySelector('.text-box-line-group--c-array .free-line');
  const textP_cArray_explain = textbox_cArray.querySelector('.text-box__paragraph--explain');
  const textP_cArray_refArray = textbox_cArray.querySelector('.text-box__paragraph--ref-array');
  /****************************************************** */
  // EXPLAIN WHAT A COMPATIBLE JOB IS
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Explain what a compatible job is');
    animSequence.addManyBlocks([
      [ 'std', textbox_placeBars, 'fade-out' ],
      [ 'std', jArray1, 'enter-wipe-from-left' ],
      [ 'std', cArray, 'enter-wipe-from-left', {blocksPrev: false} ],
      [ 'std', textbox_cArray, 'fade-in', {blocksPrev: false} ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // EXPLAIN WHAT C ARRAY WILL BE USED FOR
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Explain what c array will be used for');
    animSequence.addManyBlocks([
      [ 'line', freeLine_cArray, 'enter-wipe-from-left', null, [0, 0.5], cArray, [1, 0.5] ],
      [ 'std',  textP_cArray_explain, 'fade-out', {duration: 250} ],
      [ 'std',  textP_cArray_refArray, 'fade-in', {duration: 250} ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // HIDE EXPLANATION OF C ARRAY'S PURPOSE AND CONTINUE INTO NEXT PHASE
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null, {continueNext: true}); // after hiding, immediately continue into next phase
    animSequence.setDescription(`Hide explanation of c array's purpose and continue into next phase`);
    animSequence.addManyBlocks([
      [ 'std', textbox_cArray, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_cArray, 'exit-wipe-to-left', null, [0, 0.5], cArray, [1, 0.5] ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // DEMONSTRATE HOW TO FILL OUT THE C ARRAY
  /****************************************************** */
  const textbox_fillCArray = dataDisplay.querySelector('.text-box-line-group--fill-c-array .text-box');
  const cBar = document.querySelector('.time-graph__c-bar'); // vertical bar
  const timeGraphArrowEl = timeGraphEl.querySelector('.free-line'); // arrow connecting c entry and compatible job's row header
  jobsSorted.forEach((job) => {
    const jobBarEl = job.getJobBar();
    // get j array block corresponding to current job bar
    const jBlock = document.querySelector(`.array-group--j-and-c .array--j .array__array-block--${jobBarEl.dataset.sjnum}`);
    // Find job bar corresponding to the job that's compatible with the current job (if it exists)
    const compatibleJobBarEl = document.querySelector(`.time-graph__job-bar[data-sjnum="${jobBarEl.dataset.compatiblejobnum}"]`);
    // get the c array entry corresponding to the current job
    const cBlock = cArray.querySelector(`.array__array-block--${jobBarEl.dataset.sjnum}`);
    const cEntryValue = cBlock.querySelector(`.array__array-entry--value`);
    const cEntryBlank = cBlock.querySelector(`.array__array-entry--blank`);
    let row;
    let rowSJNum;

    const textP_fillCArray_forJobX = textbox_fillCArray.querySelector(`.text-box__paragraph--for-job-${jobBarEl.dataset.sjnum}`);
    const textP_fillCArray_resultJobX = textbox_fillCArray.querySelector(`.text-box__paragraph--result-job-${jobBarEl.dataset.sjnum}`);
    const textP_fillCArray_continueOn = textbox_fillCArray.querySelector(`.text-box__paragraph--continue-on`);

    // MOVE CBAR TO CURRENT JOB BAR, UNHIDE IT, AND HIGHLIGHT CURRENT JOB BAR AND J ARRAY BLOCK
    {
      const animSequence = new AnimSequence(null, {continuePrev: true});
      animSequence.setDescription('Move cbar to current job bar, unhide it, and highlight current job bar and j array block');
      animSequence.addManyBlocks([
        [ 'std', cBar, 'translate', {duration: 0, translateOptions: { targetElem: jobBarEl, preserveY: true }} ],
        [ 'std', jobBarEl, 'highlight', {blocksNext: false} ],
        [ 'std', jBlock, 'highlight', {blocksNext: false, blocksPrev: false} ],
        [ 'std', cBar, 'enter-wipe-from-top', {blocksPrev: false} ],
        [ 'std', textP_fillCArray_forJobX, 'fade-in', {duration: 0} ],
        [ 'std', textbox_fillCArray, 'fade-in' ],
      ]);

      animTimeline.addOneSequence(animSequence);
    }


    // MOVE CBAR, HIGHLIGHT COMPATIBLE JOB IF EXISTS, AND POINT TO C ARRAY
    {
      const animSequence = new AnimSequence();
      const animSequence2 = new AnimSequence();
      animSequence.setDescription('Move cbar and highlight compatible job if it exists');
      animSequence2.setDescription('Point to c array and fill entry');
      // If the compatible job exists, Move cbar to compatible job bar and highlight it
      // Then point arrow from compatible row header to current c-array entry
      if (compatibleJobBarEl) {
        row = document.querySelector(`.time-graph__row[data-joblettersorted="${compatibleJobBarEl.dataset.jobletter}"]`);
        rowSJNum = row.querySelector('.time-graph__SJ-num');
        animSequence.addManyBlocks([
          [ 'std', cBar, 'translate', {translateOptions: { targetElem: compatibleJobBarEl, alignmentX: 'right', preserveY: true }} ],
          [ 'std', compatibleJobBarEl, 'highlight' ],
        ]);
        animSequence2.addOneBlock(new AnimBlockLine(timeGraphArrowEl, 'enter-wipe-from-top', rowSJNum, [1, 0.5], cBlock, [0.5, 0], {blocksPrev: false}));
      }
      // If not compatible job exists, move cbar to left of time graph
      // Then point arrow from bottom of cbar to current c-array entry
      else {
        animSequence.addManyBlocks([
          [ 'std', cBar, 'translate', {translateOptions: { targetElem: timeGraphEl, alignmentX: 'left', preserveY: true }} ],
        ]);
        animSequence2.addOneBlock(new AnimBlockLine(timeGraphArrowEl, 'enter-wipe-from-top', cBar, [0, 1], cBlock, [0.5, 0], {blocksPrev: false}));
      }

      animSequence.addManyBlocks([
        [ 'std', textP_fillCArray_forJobX, 'fade-out', {duration: 250} ],
        [ 'std', textP_fillCArray_resultJobX, 'fade-in', {duration: 250} ],
      ])
    
      // "Update" current c-array entry
      animSequence2.addManyBlocks([
        [ 'std', cEntryBlank, 'exit-wipe-to-left', {blocksPrev: false, blocksNext: false} ],
        [ 'std', cEntryValue, 'enter-wipe-from-right', {blocksPrev: false} ],
        [ 'std', textP_fillCArray_resultJobX, 'fade-out', {duration: 250, blocksPrev: false} ],
        [ 'std', textP_fillCArray_continueOn, 'fade-in', {duration: 250} ],
      ]);
    
      animTimeline.addOneSequence(animSequence);
      animTimeline.addOneSequence(animSequence2);
    }


    // HIDE CBAR AND ARROW AND UN-HIGHLIGHT EVERYTHING
    {
      const animSequence = new AnimSequence(null, {continueNext: true});
      animSequence.setDescription('Hide cbar and arrow and un-highlight everything');
      if (compatibleJobBarEl) {
        animSequence.addManyBlocks([
          [ 'std', compatibleJobBarEl, 'un-highlight', {blocksNext: false} ],
          [ 'line', timeGraphArrowEl, 'exit-wipe-to-top', rowSJNum, [1, 0.5], cBlock, [0.5, 0], {blocksPrev: false, blocksNext: false} ]
        ]);
      }
      else {
        animSequence.addOneBlock([ 'line', timeGraphArrowEl, 'exit-wipe-to-top', cBar, [0, 1], cBlock, [0.5, 0], {blocksPrev: false, blocksNext: false} ]);
      }
      animSequence.addManyBlocks([
        [ 'std', textbox_fillCArray, 'fade-out', {blocksPrev: false, blocksNext: false} ],
        // [ 'std', textP_fillCArray_continueOn, 'fade-out', {duration: 0}], // TODO: This being here and having to add blocksNext: false above needs to be considered
        [ 'std', cBar, 'fade-out', {blocksNext: false, blocksPrev: false} ],
        [ 'std', jobBarEl, 'un-highlight', {blocksPrev: false, blocksNext: false} ],
        [ 'std', jBlock, 'un-highlight', {blocksPrev: false} ],
        [ 'std', textP_fillCArray_continueOn, 'fade-out', {duration: 0}],
      ]);
      animTimeline.addOneSequence(animSequence);
    }
  });


  const textbox_finishedCArray = dataDisplay.querySelector('.text-box-line-group--finished-c-array .text-box');
  const freeLine_showNaive = dataDisplay.querySelector('.text-box-line-group--show-naive .free-line');
  const textbox_showNaive = dataDisplay.querySelector('.text-box-line-group--show-naive .text-box');
  const algorithm_term1 = textbox_showNaive.querySelector('.algorithm__term-1');
  const algorithm_term2 = textbox_showNaive.querySelector('.algorithm__term-2');
  /****************************************************** */
  // STATE THAT NOW WE NEED TO FIND THE MAXIMUM WEIGHT
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null, {continuePrev: true});
    animSequence.setDescription('State that now we need to find the maximum weight');
    animSequence.setTag('finished c array');
    animSequence.addManyBlocks([
      [ 'std', textbox_finishedCArray, 'fade-in' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // SHOW NAIVE APPROACH TO FINDING MAX WEIGHT
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null);
    animSequence.setDescription('Explain naive approach to finding max weight');
    animSequence.setTag('show naive');
    animSequence.addManyBlocks([
      [ 'std', textbox_showNaive, 'translate', {duration: 0, translateOptions: {targetElem: textbox_finishedCArray, offsetTargetY: 1, offsetY: 10, offsetUnitsY: 'rem'}} ],
      [ 'line', freeLine_showNaive, 'enter-wipe-from-top', textbox_finishedCArray, [0.5, 1], null, [0.5, 0] ],
      [ 'std', textbox_showNaive, 'fade-in' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }

  const textbox_explainNaive1 = dataDisplay.querySelector('.text-box-line-group--explain-naive-1 .text-box');
  const freeLine_explainNaive1 = dataDisplay.querySelector('.text-box-line-group--explain-naive-1 .free-line');
  /****************************************************** */
  // EXPLAIN POSSIBILITY THAT JOB IS PART OF OPTIMAL SEQUENCE
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null);
    animSequence.setDescription('Explain possibility that job is part of optimal sequence');
    animSequence.setTag('explain naive');
    animSequence.addManyBlocks([
      [ 'std', textbox_explainNaive1, 'translate', {duration: 0, translateOptions: {targetElem: textbox_showNaive, offsetTargetY: 1, offsetY: 10, offsetUnitsY: 'rem', offsetTargetX: -1.0, offsetX: 10, offsetUnitsX: 'rem'}} ],
      [ 'std', algorithm_term1, 'highlight' ],
      [ 'line', freeLine_explainNaive1, 'enter-wipe-from-top', algorithm_term1, [0.5, 1], null, [0.5, 0] ],
      [ 'std', textbox_explainNaive1, 'fade-in' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }

  const textbox_explainNaive2 = dataDisplay.querySelector('.text-box-line-group--explain-naive-2 .text-box');
  const freeLine_explainNaive2 = dataDisplay.querySelector('.text-box-line-group--explain-naive-2 .free-line');
  /****************************************************** */
  // EXPLAIN POSSIBILITY THAT JOB IS **NOT** PART OF OPTIMAL SEQUENCE
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null);
    animSequence.setDescription('Explain possibility that job is NOT part of optimal sequence');
    animSequence.setTag('explain naive');
    animSequence.addManyBlocks([
      [ 'std', textbox_explainNaive2, 'translate', {duration: 0, translateOptions: {targetElem: textbox_showNaive, offsetTargetY: 1, offsetY: 10, offsetUnitsY: 'rem', offsetTargetX: 1.0, offsetX: -10, offsetUnitsX: 'rem', alignmentX: 'right'}} ],
      [ 'std', algorithm_term2, 'highlight' ],
      [ 'line', freeLine_explainNaive2, 'enter-wipe-from-top', algorithm_term2, [0.5, 1], null, [0.5, 0] ],
      [ 'std', textbox_explainNaive2, 'fade-in' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }

  /****************************************************** */
  // HIDE NAIVE APPROACH EXPLANATIONS
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null, {continueNext: true});
    animSequence.setDescription('Hide naive approach explanations');
    animSequence.setTag('explain naive bad');
    animSequence.addManyBlocks([
      [ 'std', textbox_explainNaive1, 'fade-out', {blocksNext: false} ],
      [ 'std', textbox_explainNaive2, 'fade-out', {blocksNext: false, blocksPrev: false} ],
      [ 'line', freeLine_explainNaive1, 'exit-wipe-to-top', algorithm_term1, [0.5, 1], null, [0.5, 0], {blocksNext: false} ],
      [ 'line', freeLine_explainNaive2, 'exit-wipe-to-top', algorithm_term2, [0.5, 1], null, [0.5, 0], {blocksNext: false, blocksPrev: false} ],
      [ 'std', algorithm_term1, 'un-highlight', {blocksNext: false} ],
      [ 'std', algorithm_term2, 'un-highlight', {blocksPrev: false} ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  const textbox_explainNaiveBad = dataDisplay.querySelector('.text-box-line-group--explain-naive-bad .text-box');
  const freeLine_explainNaiveBad = dataDisplay.querySelector('.text-box-line-group--explain-naive-bad .free-line');
  /****************************************************** */
  // EXPLAIN WHY NAIVE APPROACH IS BAD
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null, {continuePrev: true});
    animSequence.setDescription('Explain why naive approach is bad');
    animSequence.addManyBlocks([
      [ 'std', textbox_explainNaiveBad, 'translate', {duration: 0, translateOptions: {targetElem: textbox_showNaive, offsetTargetY: 1, offsetY: 10, offsetUnitsY: 'rem'}} ],
      [ 'line', freeLine_explainNaiveBad, 'enter-wipe-from-top', textbox_showNaive, [0.5, 1], null, [0.5, 0] ],
      [ 'std', textbox_explainNaiveBad, 'fade-in', {blocksPrev: false} ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  const naiveAlgorithmText = dataDisplay.querySelector('.naive-algorithm-text');
  /****************************************************** */
  // COLLAPSE TEXT BOXES ABOUT THE NAIVE APPROACH
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null, {continueNext: true});
    animSequence.setDescription('Collapse text boxes about the naive approach');
    animSequence.addManyBlocks([
      [ 'std', naiveAlgorithmText, 'fade-out' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }

  const arrayGroup_j_M = dataDisplay.querySelector('.array-group--j-and-M');
  const MArray = arrayGroup_j_M.querySelector('.array--M');
  const jArray2 = arrayGroup_j_M.querySelector('.array--j');
  const textbox_MArray = dataDisplay.querySelector('.text-box-line-group--M-array .text-box');
  const freeLine_MArray = dataDisplay.querySelector('.text-box-line-group--M-array .free-line');
  const textP_MArray_explain = textbox_MArray.querySelector('.text-box__paragraph--explain');
  const textP_MArray_refArray = textbox_MArray.querySelector('.text-box__paragraph--ref-array');
  /****************************************************** */
  // EXPLAIN MEMOIZATION
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null, {continuePrev: true});
    animSequence.setDescription('Explain memoization');
    animSequence.setTag('introduce memoization');
    animSequence.addManyBlocks([
      [ 'std', jArray2, 'enter-wipe-from-left' ],
      [ 'std', MArray, 'enter-wipe-from-left', {blocksPrev: false} ],
      [ 'std', textbox_MArray, 'fade-in' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }

  const arrayBlock_M_0 = MArray.querySelector('.array__array-block--0');
  const arrayBlank_M_0 = arrayBlock_M_0.querySelector('.array__array-entry--blank');
  const arrayValue_M_0 = arrayBlock_M_0.querySelector('.array__array-entry--value');
  /****************************************************** */
  // EXPLAIN WHAT M ARRAY WILL BE USED FOR
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Explain what M array will be used for');
    animSequence.addManyBlocks([
      [ 'line', freeLine_MArray, 'enter-wipe-from-left', null, [0, 0.5], MArray, [1, 0.5] ],
      [ 'std',  textP_MArray_explain, 'fade-out', {duration: 250} ],
      [ 'std',  textP_MArray_refArray, 'fade-in', {duration: 250} ],
      [ 'std', arrayBlank_M_0, 'fade-out' ],
      [ 'std', arrayValue_M_0, 'fade-in' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  const textbox_showMemoized = dataDisplay.querySelector('.text-box-line-group--show-memoized .text-box');
  const freeLine_showMemoized = dataDisplay.querySelector('.text-box-line-group--show-memoized .free-line');
  /****************************************************** */
  // SHOW MEMOIZED ALGORITHM
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Show memoized algorithm');
    animSequence.addManyBlocks([
      [ 'std', textbox_showMemoized, 'translate', {duration: 0, translateOptions: {targetElem: textbox_MArray, offsetTargetX: 1, offsetX: 20, offsetXUnits: 'rem', preserveY: true}} ],
      [ 'line', freeLine_showMemoized, 'enter-wipe-from-left', textbox_MArray, [1, 0.5], null, [0, 0.5] ],
      [ 'std',  textbox_showMemoized, 'fade-in' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }


  const MArrayTextBoxes = MArray.querySelector('.text-boxes');
  const dataDisplayBorder = dataDisplay.querySelector('.data-display__right-border');
  /****************************************************** */
  // HIDE M ARRAY TEXT EXPLANATION BOXES
  /****************************************************** */
  {
    const animSequence = new AnimSequence(null, {continueNext: true});
    animSequence.setDescription('Hide M array text explanation boxes');
    animSequence.addManyBlocks([
      [ 'std', MArrayTextBoxes, 'fade-out' ],
      [ 'std', dataDisplayBorder, 'enter-wipe-from-top' ],
    ]);
    animTimeline.addOneSequence(animSequence);
  }
};

// recursively creates animation sequences for the job card tree
function animateJobCard(jobCard, parentAnimSequence, parentArrowDown, parentArrowSource, aboveBullet) {
  const SJNum = Number.parseInt(jobCard.dataset.sjnum);
  const jobCardContent = jobCard.querySelector('.job-card-content');
  const SJNumLabel = jobCardContent.querySelector('.job-card-SJ-num-label');
  const MAccessContainer = jobCard.querySelector('.M-access-container');
  const MAccess = jobCard.querySelector('.M-access');
  const MEntry = jobCard.querySelector('.M-entry');
  const freeLine_MAccess = jobCard.querySelector('.text-box-line-group--M-access .free-line');
  const textbox_MAccess = jobCard.querySelector('.text-box-line-group--M-access .text-box');
  const textP_MAccess_intro = textbox_MAccess.querySelector('.text-box__paragraph--intro');
  const textP_MAccess_solved = textbox_MAccess.querySelector('.text-box__paragraph--solved');

  const freeLine_toMBlock = jobCard.querySelector('.free-line--M-access-to-M-block');


  const arrowContainer = jobCard.querySelector('.arrow-container');
  const formulaContainer = jobCard.querySelector('.formula-container');
  const formulaComputation = jobCard.querySelector('.formula-computation');
  const formulaResult = jobCard.querySelector('.formula-result');
  const freeLine_formulaComputation = jobCard.querySelector('.text-box-line-group--formula-computation .free-line');
  const textbox_formulaComputation = jobCard.querySelector('.text-box-line-group--formula-computation .text-box');
  const textP_formulaComputation_find = textbox_formulaComputation.querySelector('.text-box__paragraph--find');
  const textP_formulaComputation_max = textbox_formulaComputation.querySelector('.text-box__paragraph--max');
  const textP_formulaComputation_found = textbox_formulaComputation.querySelector('.text-box__paragraph--found');


  const computation1 = jobCard.querySelector('.computation--1');
  const computationResult1 = computation1.querySelector('.computation-result');
  const freeLine_computation1 = jobCard.querySelector('.text-box-line-group--computation--1 .free-line');
  const textbox_computation1 = jobCard.querySelector('.text-box-line-group--computation--1 .text-box');
  const computationExpression1 = jobCard.querySelector('.computation--1 .computation-expression');
  const textP_computation1_intro = textbox_computation1.querySelector('.text-box__paragraph--intro');
  const textP_computation1_summary = textbox_computation1.querySelector('.text-box__paragraph--summary');
  const cAccessContainer = jobCard.querySelector('.c-access-container');
  const cAccess = jobCard.querySelector('.c-access');
  const cEntry = jobCard.querySelector('.c-entry');
  const freeLine_cAccess = jobCard.querySelector('.text-box-line-group--c-access .free-line');
  const textbox_cAccess = jobCard.querySelector('.text-box-line-group--c-access .text-box');
  const textP_cAccess_find = textbox_cAccess.querySelector('.text-box__paragraph--find');
  const textP_cAccess_found = textbox_cAccess.querySelector('.text-box__paragraph--found');
  const freeLine_toCBlock = jobCard.querySelector('.free-line--c-access-to-c-block');
  const OPTExpressionContainer1 = jobCard.querySelector('.computation-expression--1 .OPT-expression-container');
  const OPTExpression1 = OPTExpressionContainer1.querySelector('.OPT-expression');
  const OPTResult1 = OPTExpressionContainer1.querySelector('.OPT-result');
  const freeLine_OPTExpression1 = jobCard.querySelector('.text-box-line-group--OPT-expression-1 .free-line');
  const textbox_OPTExpression1 = jobCard.querySelector('.text-box-line-group--OPT-expression-1 .text-box');
  const textP_OPTExpression1_find = textbox_OPTExpression1.querySelector('.text-box-line-group--OPT-expression-1 .text-box__paragraph--find');
  const textP_OPTExpression1_found = textbox_OPTExpression1.querySelector('.text-box-line-group--OPT-expression-1 .text-box__paragraph--found');


  const computation2 = jobCard.querySelector('.computation--2');
  const computationResult2 = computation2.querySelector('.computation-result');
  const OPTExpression2 = computation2.querySelector('.OPT-expression');
  const freeLine_computation2 = jobCard.querySelector('.text-box-line-group--computation--2 .free-line');
  const textbox_computation2 = jobCard.querySelector('.text-box-line-group--computation--2 .text-box');
  const textP_computation2_intro = textbox_computation2.querySelector('.text-box__paragraph--intro');
  const textP_computation2_summary = textbox_computation2.querySelector('.text-box__paragraph--summary');
  const freeLine_OPTExpression2 = jobCard.querySelector('.text-box-line-group--OPT-expression-2 .free-line');
  const textbox_OPTExpression2 = jobCard.querySelector('.text-box-line-group--OPT-expression-2 .text-box');
  const nextSJNumExpression = computation2.querySelector('.next-SJ-num-expression');
  const nextSJNum = computation2.querySelector('.next-SJ-num');


  const jobCardChild1 = [...jobCard.querySelector('.job-card-children').children][0];
  const jobCardChild2 = [...jobCard.querySelector('.job-card-children').children][1];


  const MBlock = document.querySelector(`.array--M .array__array-block--${SJNum}`);
  const MBlock_blank = MBlock.querySelector(`.array__array-entry--blank`);
  const MBlock_value = MBlock.querySelector(`.array__array-entry--value`);
  const cBlock = document.querySelector(`.array--c .array__array-block--${SJNum}`);


  const freeLine_upTree = jobCard.querySelector('.free-line--up-tree');
  const freeLine_downTree = jobCard.querySelector('.free-line--down-tree');
  const jobCardBullet = jobCard.querySelector('.job-card-bullet');


  /****************************************************** */
  // FADE IN JOB CARD AND M ACCESS
  /****************************************************** */
  {
    const animSequence = parentAnimSequence ?? new AnimSequence(null, {continuePrev: true});
    animSequence.setDescription('Fade in job card and M access');
    animSequence.setTag('start');
    animSequence.addManyBlocks([
      [ 'std', jobCard, 'fade-in', {blocksNext: parentArrowDown ? false : true} ], // TODO: blocksPrev being false wouldn't make the data-display border disappear in parallel
    ]);
    if (parentArrowDown) {
      animSequence.addManyBlocks([
        [ 'line', parentArrowDown, 'enter-wipe-from-top', parentArrowSource, [0, 1], SJNumLabel, [0.5, -0.2], {blocksPrev: false} ],
      ]);
    }
    if (aboveBullet) {
      const freeLine_bulletConnector = jobCard.querySelector('.free-line--bullet-connector');
      animSequence.addManyBlocks([
        [ 'line', freeLine_bulletConnector, 'enter-wipe-from-top', aboveBullet, [0.5, 0.5], jobCardBullet, [0.5, 0.5] ],
      ]);
    }
    animSequence.addManyBlocks([
      [ 'std', MAccess, 'fade-in' ],
      [ 'std', MAccessContainer, 'highlight', {blocksNext: false, blocksPrev: false} ],
      [ 'line', freeLine_MAccess, 'enter-wipe-from-bottom', MAccess, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_MAccess, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // POINT TO M BLOCK ARRAY ENTRY
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Point to M block array entry');
    animSequence.addOneBlock([ 'line', freeLine_toMBlock, 'enter-wipe-from-right', MAccessContainer, [0, 0.5], MBlock, [0.9, 0.5], {lineOptions: {trackEndpoints: true}} ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // FOCUS ON FORMULA CONTAINER
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Focus on formula container');
    animSequence.addManyBlocks([
      [ 'line', freeLine_toMBlock, 'exit-wipe-to-right', MAccessContainer, [0, 0.5], MBlock, [0.9, 0.5], {lineOptions: {trackEndpoints: true}} ],
      [ 'std', textbox_MAccess, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_MAccess, 'exit-wipe-to-bottom', MAccess, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', MAccessContainer, 'un-highlight' ],

      [ 'std', arrowContainer, 'enter-wipe-from-right' ],
      [ 'std', formulaComputation, 'fade-in', {blocksPrev: false} ],
      [ 'std', formulaComputation, 'highlight', {blocksNext: false} ],
      [ 'line', freeLine_formulaComputation, 'enter-wipe-from-bottom', formulaComputation, [0.1, 0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_formulaComputation, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // FOCUS ON COMPUTATION 1
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Focus on computation 1');
    animSequence.addManyBlocks([
      [ 'std', textbox_formulaComputation, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_formulaComputation, 'exit-wipe-to-bottom', formulaComputation, [0.1, 0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', formulaComputation, 'un-highlight', {blocksPrev: false} ],

      [ 'std', computationExpression1, 'highlight', {blocksNext: false} ],
      [ 'line', freeLine_computation1, 'enter-wipe-from-bottom', computation1, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_computation1, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // FOCUS ON C ACCESS
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Focus on c access');
    animSequence.addManyBlocks([
      [ 'std', textbox_computation1, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_computation1, 'exit-wipe-to-bottom', computation1, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', computationExpression1, 'un-highlight', {blocksNext: false, blocksPrev: false} ],
  
      [ 'std', cAccessContainer, 'highlight', {blocksPrev: false} ],
      [ 'line', freeLine_cAccess, 'enter-wipe-from-bottom', cAccessContainer, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_cAccess, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // POINT TO C ARRAY ENTRY
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Point to c array entry');
    animSequence.addManyBlocks([
      [ 'line', freeLine_toCBlock, 'enter-wipe-from-right', cAccessContainer, [0, 0.5], cBlock, [0.9, 0.5], {blocksPrev: false, lineOptions: {trackEndpoints: true}} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // REVERSE ARROW AND REPLACE C ACCESS WITH VALUE
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Reverse arrow and replace c access with value');
    animSequence.addManyBlocks([
      [ 'line', freeLine_toCBlock, 'fade-out', cAccessContainer, [0, 0.5], cBlock, [0.9, 0.5], {lineOptions: {trackEndpoints: true}} ],
      [ 'line', freeLine_toCBlock, 'enter-wipe-from-left', cBlock, [0.9, 0.5], cAccessContainer, [-0.1, 0.5], {lineOptions: {trackEndpoints: true}} ],
      [ 'line', freeLine_cAccess, 'updateEndpoints', cAccessContainer, [0.5, -0.2], null, [0.5, 1] ],
      [ 'std', cAccess, 'exit-wipe-to-left', {blocksPrev: false} ],
      [ 'std', cEntry, 'enter-wipe-from-right', {blocksNext: false} ],
      [ 'line', freeLine_cAccess, 'updateEndpoints', cAccessContainer, [0.5, -0.2], null, [0.5, 1] ],
      [ 'std', textP_cAccess_find, 'fade-out', { duration: 250 } ],
      [ 'std', textP_cAccess_found, 'fade-in', { duration: 250 } ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // FOCUS ON OPT EXPRESSION 1 AS A WHOLE
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Focus on OPT expression 1 as a whole');
    animSequence.addManyBlocks([
      // hide arrow for c block
      [ 'line', freeLine_toCBlock, 'fade-out', cBlock, [0.9, 0.5], cAccessContainer, [0, 0.5], {lineOptions: {trackEndpoints: true}} ],
  
      // remove c access text
      [ 'std', textbox_cAccess, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_cAccess, 'exit-wipe-to-bottom', cAccessContainer, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', cAccessContainer, 'un-highlight', {blocksPrev: false} ],
  
      // enter OPT expression 1 text
      [ 'std', OPTExpressionContainer1, 'highlight', {blocksPrev: false, blocksNext: false} ],
      [ 'line', freeLine_OPTExpression1, 'enter-wipe-from-bottom', OPTExpressionContainer1, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_OPTExpression1, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }

  /****************************************************** */
  // RECURSION 1
  /****************************************************** */
  let sourceEl_OPT1, freeLine_fromSourceEl1; // pointing up from child
  {
    const animSeqPassDown = new AnimSequence();
    // add blocks to hide text about OPT expression before recursion
    animSeqPassDown.addManyBlocks([
      [ 'std', textbox_OPTExpression1, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_OPTExpression1, 'exit-wipe-to-bottom', cAccessContainer, [0.5, -0.2], null, [0.5, 1] ],
    ]);
    let animSequence;
    // generate animation sequences for first child job/stub
    [animSequence, sourceEl_OPT1, freeLine_fromSourceEl1] = jobCardChild1.classList.contains('job-card--stub') ?
      animateJobStub(jobCardChild1, animSeqPassDown, freeLine_downTree, OPTExpressionContainer1, jobCardBullet) :
      animateJobCard(jobCardChild1, animSeqPassDown, freeLine_downTree, OPTExpressionContainer1, jobCardBullet);
    /****************************************************** */
    // REPLACE OPT1 EXPRESSION WITH ANSWER, CHANGE TEXT BOX TEXT
    /****************************************************** */
    animSequence.setDescription('Replace OPT1 expression with answer, change text box text');
    animSequence.setTag('OPT point 1');
    animSequence.addManyBlocks([
      [ 'line', freeLine_fromSourceEl1, 'enter-wipe-from-bottom', sourceEl_OPT1, [0.5, -0.2], OPTExpressionContainer1, [0, 1.1] ],
      [ 'std', OPTExpression1, 'exit-wipe-to-left', {blocksPrev: false} ],
      [ 'std', OPTResult1, 'enter-wipe-from-right', {blocksNext: false} ],
      [ 'std', textP_OPTExpression1_find, 'fade-out', { duration: 250 } ],
      [ 'std', textP_OPTExpression1_found, 'fade-in', { duration: 250 } ],
      [ 'line', freeLine_OPTExpression1, 'enter-wipe-from-bottom', OPTResult1, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_OPTExpression1, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }
  

  /****************************************************** */
  // REMOVE ARROW COMING FROM CHILD, HIDE CURRENT TEXT; REPLACE COMPUTATION EXPRESSION WITH ANSWER; AND FOCUS ON WHOLE COMPUTATION1 (SWAP TEXT AS WELL)
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription(`Remove arrow coming from child, hide current text, replace computation expression with answer, and focus on whole computation1 (swap text as well)`);
    animSequence.addManyBlocks([
      [ 'line', freeLine_fromSourceEl1, 'fade-out', sourceEl_OPT1, [0.5, -0.2], OPTExpressionContainer1, [0, 1], {blocksNext: false} ],
      [ 'std', textbox_OPTExpression1, 'fade-out', {blocksPrev: false, blocksNext: false} ],
      [ 'line', freeLine_OPTExpression1, 'exit-wipe-to-bottom', OPTExpressionContainer1, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', OPTExpressionContainer1, 'un-highlight', {blocksPrev: false} ],
  
      [ 'std', textP_computation1_intro, 'fade-out', {duration: 0, blocksNext: false} ],
      [ 'std', textP_computation1_summary, 'fade-in', {duration: 0, blocksPrev: false} ],
      [ 'std', computationExpression1, 'exit-wipe-to-left', ],
      [ 'std', computationResult1, 'enter-wipe-from-right', ],
      [ 'std', computationResult1, 'highlight', {blocksPrev: false, blocksNext: false} ],
      [ 'line', freeLine_computation1, 'enter-wipe-from-bottom', computationResult1, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_computation1, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // FOCUS ON COMPUTATION 2
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Focus on computation 2');
    animSequence.setTag('focus comp 2');
    animSequence.addManyBlocks([
      [ 'std', textbox_computation1, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_computation1, 'exit-wipe-to-bottom', computationResult1, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', computationResult1, 'un-highlight', {blocksPrev: false} ],

      [ 'std', computation2, 'highlight', {blocksNext: false} ],
      [ 'line', freeLine_computation2, 'enter-wipe-from-bottom', computation2, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_computation2, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // REPLACE SUBTRACTION WITH RESULT; THEN FOCUS ON OPT EXPRESSION 2
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Replace subtraction with result; then focus on OPT expression 2');
    animSequence.addManyBlocks([
      [ 'std', textbox_computation2, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_computation2, 'exit-wipe-to-bottom', computation2, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
  
      [ 'std', nextSJNumExpression, 'exit-wipe-to-left' ],
      [ 'std', nextSJNum, 'enter-wipe-from-right' ],
  
      [ 'line', freeLine_OPTExpression2, 'enter-wipe-from-bottom', computation2, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_OPTExpression2, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // RECURSION 2
  /****************************************************** */
  let sourceEl_OPT2, freeLine_fromSourceEl2; // pointing up from child
  {
    const animSeqPassDown = new AnimSequence();
    animSeqPassDown.addManyBlocks([
      [ 'std', textbox_OPTExpression2, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_OPTExpression2, 'exit-wipe-to-bottom', computation2, [0.5, -0.2], null, [0.5, 1] ],
    ]);
    let animSequence;
    // create animation sequences for second child card/stub
    [animSequence, sourceEl_OPT2, freeLine_fromSourceEl2] = jobCardChild2.classList.contains('job-card--stub') ?
      animateJobStub(jobCardChild2, animSeqPassDown, freeLine_downTree, OPTExpression2, jobCardChild1.querySelector('.job-card-bullet')) :
      animateJobCard(jobCardChild2, animSeqPassDown, freeLine_downTree, OPTExpression2, jobCardChild1.querySelector('.job-card-bullet'));
    /****************************************************** */
    // REPLACE OPT2 EXPRESSION WITH ANSWER, HIDE OLD TEXT, AND ADD COMPUTATION 2 TEXT WITH SWAPPED TEXT
    /****************************************************** */
    animSequence.setDescription('Replace OPT2 expression with answer, hide old text, and add computation 2 text with swapped text');
    animSequence.addManyBlocks([
      [ 'line', freeLine_fromSourceEl2, 'enter-wipe-from-bottom', sourceEl_OPT2, [0.5, -0.2], computation2, [0, 1.1] ],

      [ 'std', textP_computation2_intro, 'fade-out', {duration: 0, blocksNext: false} ],
      [ 'std', textP_computation2_summary, 'fade-in', {duration: 0, blocksPrev: false} ],

      [ 'std', computation2, 'un-highlight', {blocksNext: false} ],
      [ 'std', OPTExpression2, 'exit-wipe-to-left', {blocksPrev: false} ],
      [ 'std', computationResult2, 'enter-wipe-from-right', {blocksNext: false} ],
      [ 'std', computationResult2, 'highlight', {blocksPrev: false} ],

      [ 'line', freeLine_computation2, 'enter-wipe-from-bottom', computation2, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_computation2, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }
  

  /****************************************************** */
  // FOCUS ON WHOLE FORMULA CONTAINER
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Focus on whole formula container');
    animSequence.addManyBlocks([
      [ 'line', freeLine_fromSourceEl2, 'fade-out', sourceEl_OPT2, [0.5, -0.2], computation2, [0, 1] ],
      [ 'std', textbox_computation2, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_computation2, 'exit-wipe-to-bottom', computation2, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', computationResult2, 'un-highlight', {blocksPrev: false} ],

      
      [ 'std', textP_formulaComputation_find, 'fade-out', {duration: 0, blocksNext: false} ],
      [ 'std', textP_formulaComputation_max, 'fade-in', {duration: 0, blocksPrev: false} ],
      [ 'std', formulaContainer, 'highlight', {blocksNext: false} ],
      [ 'line', freeLine_formulaComputation, 'enter-wipe-from-bottom', formulaContainer, [0.5, 0], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_formulaComputation, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */  
  // REPLACE FORMULA CONTAINER CONTENTS WITH FINAL ANSWER
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setTag('replace formula container contents');
    animSequence.setDescription('Replace formula container contents with final answer');
    animSequence.addManyBlocks([
      [ 'line', freeLine_formulaComputation, 'updateEndpoints', formulaContainer, [0.5, 0], null, [0.5, 1] ],

      [ 'std', formulaComputation, 'exit-wipe-to-left', {blocksPrev: false} ],
      [ 'std', formulaResult, 'enter-wipe-from-right', {blocksNext: false} ],

      [ 'line', freeLine_formulaComputation, 'updateEndpoints', formulaContainer, [0.5, 0], null, [0.5, 1] ],
  
      [ 'std', textP_formulaComputation_max, 'fade-out', { duration: 250 } ],
      [ 'std', textP_formulaComputation_found, 'fade-in', { duration: 250 } ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // SHOW ONLY M CONTAINER, REPLACE M ACCESS WITH FINAL COMPUTED OPTIMAL VALUE, AND UPDATE M ARRAY BLOCK
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Show only M container, replace M access with final computed optimal value, and update M array block');
    animSequence.setTag('found max');
    animSequence.addManyBlocks([
      // hide formula container
      [ 'std', textbox_formulaComputation, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_formulaComputation, 'exit-wipe-to-bottom', formulaContainer, [0.5, -0.2], null, [0.5, 1], {blocksNext: false} ],
      [ 'std', formulaContainer, 'un-highlight', {blocksNext: false} ],
      [ 'std', formulaContainer, 'exit-wipe-to-left' ],
      [ 'std', arrowContainer, 'exit-wipe-to-left' ],
  
      // Visually update M access to final answer
      [ 'std', MAccess, 'exit-wipe-to-left' ],
      [ 'std', MEntry, 'enter-wipe-from-right' ],
      [ 'std', MAccessContainer, 'highlight' ],
  
      // Visually update M array entry
      [ 'line', freeLine_toMBlock, 'enter-wipe-from-right', MAccessContainer, [0, 0.5], MBlock, [0.9, 0.5], {lineOptions: {trackEndpoints: true}} ],
      [ 'std', MBlock_blank, 'fade-out' ],
      [ 'std', MBlock_value, 'fade-in' ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // REMOVE ARROW POINTING FROM M BLOCK AND SHOW FINAL TEXT BOX
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Remove arrow pointing from M block and show final text box');
    animSequence.addManyBlocks([
      // Add last text box
      [ 'std', textP_MAccess_intro, 'fade-out', {duration: 0, blocksNext: false} ],
      [ 'std', textP_MAccess_solved, 'fade-in', {duration: 0, blocksPrev: false} ],
      [ 'line', freeLine_toMBlock, 'exit-wipe-to-right', MAccessContainer, [0, 0.5], MBlock, [0.9, 0.5], {lineOptions: {trackEndpoints: true}} ],
      [ 'line', freeLine_MAccess, 'enter-wipe-from-bottom', MAccessContainer, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false, lineOptions: {trackEndpoints: true}} ],
      [ 'std', textbox_MAccess, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // IF THIS IS A CHILD, ADD BLOCKS FOR HIDING PARENT ARROW BEFORE GOING BACK UP RECURSION TREE
  /****************************************************** */
  if (parentArrowDown) {
    // just for hiding the last text box before moving back up the tree
    const animSequence = new AnimSequence();
    animSequence.setTag('finish a main card');
    animSequence.addManyBlocks([
      [ 'std', textbox_MAccess, 'fade-out', {blocksNext: false} ],
      [ 'line', freeLine_MAccess, 'exit-wipe-to-bottom', MAccessContainer, [0.1, 0.2], null, [0.5, 1] ],
      [ 'line', parentArrowDown, 'fade-out', parentArrowSource, [0, 1], SJNumLabel, [0.5, -0.2], {blocksNext: false} ],
      [ 'std', MAccessContainer, 'un-highlight', {blocksPrev: false} ],
    ]);

    return [animSequence, MAccessContainer, freeLine_upTree];
  }
};

// terminal function that creates the animation sequences for job stubs (which are leaves of the job card tree)
function animateJobStub(jobCard, parentAnimSequence, parentArrowDown, parentArrowSource, aboveBullet) {
  const SJNum = Number.parseInt(jobCard.dataset.sjnum);
  const jobCardContent = jobCard.querySelector('.job-card-content');
  const SJNumLabel = jobCardContent.querySelector('.job-card-SJ-num-label');
  const MAccessContainer = jobCard.querySelector('.M-access-container');
  const MAccess = jobCard.querySelector('.M-access');
  const MEntry = jobCard.querySelector('.M-entry');
  const freeLine_MAccess = jobCard.querySelector('.text-box-line-group--M-access .free-line');
  const textbox_MAccess = jobCard.querySelector('.text-box-line-group--M-access .text-box');
  const textbox_MAccess_p1 = jobCard.querySelector('.text-box-line-group--M-access .text-box .text-box__paragraph--1');
  const textbox_MAccess_p2 = jobCard.querySelector('.text-box-line-group--M-access .text-box .text-box__paragraph--2');
  const freeLine_toMBlock = jobCard.querySelector('.free-line--M-access-to-M-block');


  const MBlock = document.querySelector(`.array--M .array__array-block--${SJNum}`);

  
  const freeLine_bulletConnector = jobCard.querySelector('.free-line--bullet-connector');
  const freeLine_upTree = jobCard.querySelector('.free-line--up-tree');
  const jobCardBullet = jobCard.querySelector('.job-card-bullet');


  /****************************************************** */
  // FADE IN JOB STUB AND M ACCESS
  /****************************************************** */
  {
    const animSequence = parentAnimSequence;
    animSequence.addManyBlocks([
      [ 'std', jobCard, 'fade-in', {blocksNext: false} ],
    ]);
    animSequence.addManyBlocks([
      [ 'line', freeLine_bulletConnector, 'enter-wipe-from-top', aboveBullet, [0.5, 0.5], jobCardBullet, [0.5, 0.5] ],
    ]);
    animSequence.setDescription('Fade in job stub and M access');
    animSequence.addManyBlocks([
      [ 'line', parentArrowDown, 'enter-wipe-from-top', parentArrowSource, [0, 1], SJNumLabel, [0.5, -0.2], {blocksPrev: false} ],
      [ 'std', MAccess, 'fade-in' ],
      [ 'std', MAccessContainer, 'highlight', {blocksNext: false, blocksPrev: false} ],
      [ 'line', freeLine_MAccess, 'enter-wipe-from-bottom', MAccessContainer, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false} ],
      [ 'std', textbox_MAccess, 'fade-in', {blocksPrev: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // POINT TO M BLOCK ARRAY ENTRY
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Point to M block array entry');
    animSequence.addOneBlock([ 'line', freeLine_toMBlock, 'enter-wipe-from-right', MAccessContainer, [0, 0.5], MBlock, [0.9, 0.5], {lineOptions: {trackEndpoints: true}} ]);

    animTimeline.addOneSequence(animSequence);
  }
  

  /****************************************************** */
  // POINT BACK TO M ACCESS FROM M BLOCK
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.setDescription('Point back to M access from M block');
    animSequence.addManyBlocks([
      [ 'line', freeLine_toMBlock, 'fade-out', MAccessContainer, [0, 0.5], MBlock, [0.9, 0.5], {lineOptions: {trackEndpoints: true}} ],
      [ 'line', freeLine_toMBlock, 'enter-wipe-from-left', MBlock, [0.9, 0.5], MAccessContainer, [0, 0.5], {lineOptions: {trackEndpoints: true}} ],
      [ 'std', MAccess, 'exit-wipe-to-left' ],
      [ 'std', MEntry, 'enter-wipe-from-right' ],
      [ 'std', textbox_MAccess_p1, 'fade-out', {duration: 250, blocksNext: false} ],
      [ 'std', textbox_MAccess_p2, 'fade-in', {duration: 250, blocksNext: false} ],
    ]);

    animTimeline.addOneSequence(animSequence);
  }


  /****************************************************** */
  // RETURN BLOCK THAT INITIALLY HIDES REMAINING STUFF AND POINTS TO PARENT
  /****************************************************** */
  {
    const animSequence = new AnimSequence();
    animSequence.addManyBlocks([
      [ 'line', freeLine_toMBlock, 'fade-out', MBlock, [0.9, 0.5], MAccessContainer, [0, 0.5], {blocksNext: false, lineOptions: {trackEndpoints: true}} ],
      [ 'line', freeLine_MAccess, 'exit-wipe-to-bottom', MAccessContainer, [0.5, -0.2], null, [0.5, 1], {blocksPrev: false, blocksNext: false} ],
      [ 'std', textbox_MAccess, 'fade-out', {blocksPrev: false} ],
      [ 'line', parentArrowDown, 'fade-out', parentArrowSource, [0, 1], SJNumLabel, [0.5, -0.2], {blocksNext: false} ],
      [ 'std', MAccessContainer, 'un-highlight', {blocksPrev: false} ],
    ]);
  
    return [animSequence, MAccessContainer, freeLine_upTree];
  }
};
