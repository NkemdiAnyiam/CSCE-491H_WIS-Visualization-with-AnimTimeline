import { JobScheduler } from './JobScheduler';
import { SceneCreator } from './SceneCreator';
import { webchalk } from 'webchalk-animate';
import * as WebChalkTypes from 'webchalk-animate/types-and-interfaces';
import { Job } from './Job';

// \[\s'std',\s(.*'~)(high|un-high)(.*')(.*)\s\]
// (\s*)(\[ 'line)

const animTimeline = webchalk.newTimeline({debugMode: false, timelineName: 'wis-viz'});

const {
  Entrance,
  Exit,
  Emphasis,
  Motion,
  ConnectorSetter,
  ConnectorEntrance,
  ConnectorExit,
  Scroller,
} = webchalk.createAnimationClipFactories();

export function generateVisualization (jobsUnsorted: Job[]) {
  const dataDisplay = document.querySelector('.data-display') as HTMLElement;
  // fade-in visualization screen
  (function() {
    const fadeinVisualization = Entrance(document.querySelector('.visualization'), '~fade-in', [], {duration: 375});
    fadeinVisualization.play();
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
  animateDataDisplay(dataDisplay, jobScheduler);
  animateJobCard(document.querySelector('.job-card') as HTMLElement); // naturally starts at the root job card
};

// allows the data display (left view with the time graph and arrays) to scroll horizontally
function setUpDataDisplayScroll (dataDisplay: HTMLElement) {
  document.addEventListener('scroll', function() {
    dataDisplay.style.left = `${-window.scrollX}px`;
  });
};

// creates animation sequences for the data display
function animateDataDisplay(dataDisplay: HTMLElement, jobScheduler: JobScheduler) {
  const getJobBarEl = (job: Job): HTMLElement | null => { return document.querySelector(`.time-graph__job-bars [data-jobletter="${job.getJobLetter()}"]`); } 

  const timeGraphEl = document.querySelector('.time-graph') as HTMLElement;
  const jobsUnsorted = jobScheduler.getJobsUnsorted();
  const jobsSorted = jobScheduler.getJobs();


  const textbox_placeBars = dataDisplay.querySelector('.text-box-line-group--place-bars .text-box') as HTMLElement;
  const connector_placeBars = dataDisplay.querySelector('.text-box-line-group--place-bars webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const paragraph_placeBars_unorder = textbox_placeBars.querySelector('.text-box__paragraph--unorder');
  const paragraph_placeBars_unorder2 = textbox_placeBars.querySelector('.text-box__paragraph--unorder-2');
  const paragraph_placeBars_order = textbox_placeBars.querySelector('.text-box__paragraph--order');
  const paragraph_placeBars_ordered = textbox_placeBars.querySelector('.text-box__paragraph--ordered');

  /****************************************************** */
  // DESCRIBE THAT WE'RE ABOUT TO MOVE BARS ONTO GRAPH
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: `Describe that we're about to move bars onto graph`,
    })
    .addClips([
      ConnectorSetter(connector_placeBars, [textbox_placeBars, 'center', 'bottom'], [getJobBarEl(jobsUnsorted[0]), 'center', 'top']),
      ConnectorEntrance(connector_placeBars, '~trace', ['from-B']),
      Entrance(textbox_placeBars, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }

  /****************************************************** */
  // MOVE JOB BARS ONTO TIME GRAPH IN UNSORTED ORDER
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Move job bars onto time graph in unsorted order',
    })
    .addClips([
      ConnectorExit(connector_placeBars, '~trace', ['from-B'], {startsNextClipToo: true}),
    ]);
    jobsUnsorted.forEach((job) => {
      const jobBarEl = getJobBarEl(job)!;
      // set up options for moving job bars to correct location
      const jobLetter = jobBarEl.dataset.jobletter;
      const startCell = document.querySelector(`.time-graph__row[data-jobletterunsorted="${jobLetter}"] .time-graph__cell--${jobBarEl.dataset.start}`) as HTMLElement;
      animSequence.addClips([Motion(jobBarEl, '~move-to', [startCell])]);
    });
    animSequence.addClips([
      Exit(paragraph_placeBars_unorder, '~fade-out', [], {duration: 250}),
      Entrance(paragraph_placeBars_unorder2, '~fade-in', [], {duration: 250}),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // MOVE JOB BARS BACK OFF OF THE TIME GRAPH
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Move job bars back off of the time graph',
    })
    .addClips([
      Exit(paragraph_placeBars_unorder2, '~fade-out', [], {duration: 250}),
      Entrance(paragraph_placeBars_order, '~fade-in', [], {duration: 250}),
    ]);
    const jobBarsInitialArea = document.querySelector('.time-graph__job-bars') as HTMLElement;
    jobsUnsorted.forEach((job) => {
      const jobBarEl = getJobBarEl(job);
      animSequence.addClips([Motion(jobBarEl, '~move-to', [jobBarsInitialArea], {startsNextClipToo: true})]);
    });

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // MOVE JOB BARS BACK ONTO THE TIME GRAPH (SORTED BY FINISH TIME) AND UPDATE TIME GRAPH ROW HEADERS
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Move job bars back onto the time graph (sorted by finish time) and update time graph row headers'
    });
    jobsSorted.forEach((job) => {
      const jobBarEl = getJobBarEl(job)!;
      // set up options for moving job bars to correct location
      const jobLetter = jobBarEl.dataset.jobletter;
      const row = document.querySelector(`.time-graph__row[data-joblettersorted="${jobLetter}"]`) as HTMLElement;
      const startCell = row.querySelector(`.time-graph__cell--${jobBarEl.dataset.start}`);
      
      // get row's header data to animate
      const rowSJNum = row.querySelector('.time-graph__SJ-num');
      const rowUnsortedLetter = row.querySelector('.time-graph__job-letter--unsorted');
      const rowSortedLetter = row.querySelector('.time-graph__job-letter--sorted');
      
      animSequence.addClips([
        Motion(jobBarEl, '~move-to', [startCell]),
        Exit(rowUnsortedLetter, '~wipe', ['from-right'], {duration: 250, startsWithPrevious: true}),
        Entrance(rowSJNum, '~wipe', ['from-right'], {duration: 250, startsWithPrevious: true, delay: 250}),
        Entrance(rowSortedLetter, '~wipe', ['from-right'], {duration: 250, startsWithPrevious: true}),
      ]);
    });

    animSequence.addClips([
      Exit(paragraph_placeBars_order, '~fade-out', [], {duration: 250}),
      Entrance(paragraph_placeBars_ordered, '~fade-in', [], {duration: 250}),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  const arrayGroup_j_c = dataDisplay.querySelector('.array-group--j-and-c') as HTMLElement;
  const cArray = arrayGroup_j_c.querySelector('.array--c') as HTMLElement;
  const jArray1 = arrayGroup_j_c.querySelector('.array--j');
  const textbox_cArray = dataDisplay.querySelector('.text-box-line-group--c-array .text-box') as HTMLElement;
  const connector_cArray = dataDisplay.querySelector('.text-box-line-group--c-array webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const paragraph_cArray_explain = textbox_cArray.querySelector('.text-box__paragraph--explain');
  const paragraph_cArray_refArray = textbox_cArray.querySelector('.text-box__paragraph--ref-array');
  /****************************************************** */
  // EXPLAIN WHAT A COMPATIBLE JOB IS
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain what a compatible job is',
    })
    .addClips([
      Exit(textbox_placeBars, '~fade-out', []),
      Entrance(jArray1, '~wipe', ['from-left']),
      Entrance(cArray, '~wipe', ['from-left']),
      Entrance(textbox_cArray, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // EXPLAIN WHAT C ARRAY WILL BE USED FOR
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain what c array will be used for',
    })
    .addClips([
      ConnectorSetter(connector_cArray, [textbox_cArray, 0, 0.5], [cArray, 1, 0.5]),
      ConnectorEntrance(connector_cArray, '~trace', ['from-B']),
      Exit(paragraph_cArray_explain, '~fade-out', [], {duration: 250}),
      Entrance(paragraph_cArray_refArray, '~fade-in', [], {duration: 250}),
    ]);
    
    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // HIDE EXPLANATION OF C ARRAY'S PURPOSE AND CONTINUE INTO NEXT PHASE
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: `Hide explanation of c array's purpose and continue into next phase`,
      autoplaysNextSequence: true, // after hiding, immediately continue into next phase
    })
    .addClips([
      Exit(textbox_cArray, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_cArray, '~trace', ['from-A']),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // DEMONSTRATE HOW TO FILL OUT THE C ARRAY
  /****************************************************** */
  const textbox_fillCArray = dataDisplay.querySelector('.text-box-line-group--fill-c-array .text-box') as HTMLElement;
  const cBar = document.querySelector('.time-graph__c-bar'); // vertical bar
  const timeGraphArrowEl = timeGraphEl.querySelector('webchalk-connector') as WebChalkTypes.WebChalkConnectorElement; // arrow connecting c entry and compatible job's row header
  jobsSorted.forEach((job) => {
    const jobBarEl = getJobBarEl(job)!;
    // get j array block corresponding to current job bar
    const jBlock = document.querySelector(`.array-group--j-and-c .array--j .array__array-block--${jobBarEl.dataset.sjnum}`);
    // Find job bar corresponding to the job that's compatible with the current job (if it exists)
    const compatibleJobBarEl = document.querySelector(`.time-graph__job-bar[data-sjnum="${jobBarEl.dataset.compatiblejobnum}"]`) as HTMLElement;
    // get the c array entry corresponding to the current job
    const cBlock = cArray.querySelector(`.array__array-block--${jobBarEl.dataset.sjnum}`) as HTMLElement;
    const cEntryValue = cBlock.querySelector(`.array__array-entry--value`);
    const cEntryBlank = cBlock.querySelector(`.array__array-entry--blank`);
    let row;
    let rowSJNum;

    const paragraph_fillCArray_forJobX = textbox_fillCArray.querySelector(`.text-box__paragraph--for-job-${jobBarEl.dataset.sjnum}`);
    const paragraph_fillCArray_resultJobX = textbox_fillCArray.querySelector(`.text-box__paragraph--result-job-${jobBarEl.dataset.sjnum}`);
    const paragraph_fillCArray_continueOn = textbox_fillCArray.querySelector(`.text-box__paragraph--continue-on`);

    // MOVE CBAR TO CURRENT JOB BAR, UNHIDE IT, AND HIGHLIGHT CURRENT JOB BAR AND J ARRAY BLOCK
    {
      const animSequence = webchalk.newSequence({
        description: 'Move cbar to current job bar, unhide it, and highlight current job bar and j array block',
      })
      .addClips([
        Motion(cBar, '~move-to', [jobBarEl, {preserveY: true}], {duration: 0, commitsStyles: true}),
        Emphasis(jobBarEl, '~highlight', [], {startsNextClipToo: true}),
        Emphasis(jBlock, '~highlight', [], {startsNextClipToo: true}),
        Entrance(cBar, '~wipe', ['from-top']),
        Entrance(paragraph_fillCArray_forJobX, '~appear', []),
        Entrance(textbox_fillCArray, '~fade-in', []),
      ]);

      animTimeline.addSequences([animSequence]);
    }


    // MOVE CBAR, HIGHLIGHT COMPATIBLE JOB IF EXISTS, AND POINT TO C ARRAY
    {
      const animSequence = webchalk.newSequence({description: 'Move cbar and highlight compatible job if it exists'});
      const animSequence2 = webchalk.newSequence({description:'Point to c array and fill entry'});
      // If the compatible job exists, Move cbar to compatible job bar and highlight it
      // Then point arrow from compatible row header to current c-array entry
      if (compatibleJobBarEl) {
        row = document.querySelector(`.time-graph__row[data-joblettersorted="${compatibleJobBarEl.dataset.jobletter}"]`) as HTMLElement;
        rowSJNum = row.querySelector('.time-graph__SJ-num');
        animSequence.addClips([
          Motion(cBar, '~move-to', [compatibleJobBarEl, {alignment: 'right top', preserveY: true}]),
          Emphasis(compatibleJobBarEl, '~highlight', []),
        ]);
        animSequence2.addClips([
          ConnectorSetter(timeGraphArrowEl, [rowSJNum, 1, 0.5], [cBlock, 0.5, 0]),
          ConnectorEntrance(timeGraphArrowEl, '~trace', ['from-top']),
        ]);
      }
      // If no compatible job exists, move cbar to left of time graph
      // Then point arrow from bottom of cbar to current c-array entry
      else {
        animSequence.addClips([
          Motion(cBar, '~move-to', [timeGraphEl, {alignment: 'left top', preserveY: true}]),
        ]);
        animSequence2.addClips([
          ConnectorSetter(timeGraphArrowEl, [cBar, 0, 1], [cBlock, 0.5, 0]),
          ConnectorEntrance(timeGraphArrowEl, '~trace', ['from-top']),
        ]);
      }

      animSequence.addClips([
        Exit(paragraph_fillCArray_forJobX, '~fade-out', [], {duration: 250}),
        Entrance(paragraph_fillCArray_resultJobX, '~fade-in', [], {duration: 250}),
      ]);
    
      // "Update" current c-array entry
      animSequence2.addClips([
        Exit(cEntryBlank, '~wipe', ['from-right'], {startsNextClipToo: true}),
        Entrance(cEntryValue, '~wipe', ['from-right']),
        Exit(paragraph_fillCArray_resultJobX, '~fade-out', [], {duration: 250}),
        Entrance(paragraph_fillCArray_continueOn, '~fade-in', [], {duration: 250}),
      ]);
    
      animTimeline.addSequences([animSequence, animSequence2]);
    }


    // HIDE CBAR AND ARROW AND UN-HIGHLIGHT EVERYTHING
    {
      const animSequence = webchalk.newSequence({
        description: 'Hide cbar and arrow and un-highlight everything',
        autoplaysNextSequence: true,
      });
      if (compatibleJobBarEl) {
        animSequence.addClips([
          Emphasis(compatibleJobBarEl, '~un-highlight', [], {startsNextClipToo: true}),
        ]);
      }
      animSequence.addClips([
        ConnectorExit(timeGraphArrowEl, '~trace', ['from-bottom'], {startsNextClipToo: true}),
      ]);
      animSequence.addClips([
        Exit(textbox_fillCArray, '~fade-out', [], {startsNextClipToo: true}),
        Exit(cBar, '~fade-out', [], {startsNextClipToo: true}),
        Emphasis(jobBarEl, '~un-highlight', [], {startsNextClipToo: true}),
        Emphasis(jBlock, '~un-highlight', []),
        Exit(paragraph_fillCArray_continueOn, '~disappear', []),
      ]);

      animTimeline.addSequences([animSequence]);
    }
  });


  const textbox_finishedCArray = dataDisplay.querySelector('.text-box-line-group--finished-c-array .text-box');
  const connector_showNaive = dataDisplay.querySelector('.text-box-line-group--show-naive webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_showNaive = dataDisplay.querySelector('.text-box-line-group--show-naive .text-box') as HTMLElement;
  const algorithm_term1 = textbox_showNaive.querySelector('.algorithm__term-1');
  const algorithm_term2 = textbox_showNaive.querySelector('.algorithm__term-2');
  /****************************************************** */
  // STATE THAT NOW WE NEED TO FIND THE MAXIMUM WEIGHT
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'State that now we need to find the maximum weight',
      jumpTag: 'finished c array',
    })
    .addClips([
      Entrance(textbox_finishedCArray, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // SHOW NAIVE APPROACH TO FINDING MAX WEIGHT
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain naive approach to finding max weight',
      jumpTag: 'show naive',
    })
    .addClips([
      Motion(textbox_showNaive, '~move-to', [textbox_finishedCArray, {targetOffset: '0% 100%', selfOffset: '0% 10rem'}], {duration: 0, commitsStyles: true}),
      ConnectorSetter(connector_showNaive, [textbox_finishedCArray, 0.5, 1], [textbox_showNaive, 0.5, 0]),
      ConnectorEntrance(connector_showNaive, '~trace', ['from-top']),
      Entrance(textbox_showNaive, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }

  const textbox_explainNaive1 = dataDisplay.querySelector('.text-box-line-group--explain-naive-1 .text-box');
  const connector_explainNaive1 = dataDisplay.querySelector('.text-box-line-group--explain-naive-1 webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  /****************************************************** */
  // EXPLAIN POSSIBILITY THAT JOB IS PART OF OPTIMAL SEQUENCE
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain possibility that job is part of optimal sequence',
      jumpTag: 'explain naive',
    })
    .addClips([
      Motion(textbox_explainNaive1, '~move-to', [textbox_showNaive, {targetOffset: '-100% 100%', selfOffset: '10rem 10rem', alignment: 'left top'}],
        {duration: 0, commitsStyles: true}),
      Emphasis(algorithm_term1, '~highlight', []),
      ConnectorSetter(connector_explainNaive1, [algorithm_term1, 0.5, 1], [textbox_explainNaive1, 0.5, 0]),
      ConnectorEntrance(connector_explainNaive1, '~trace', ['from-top']),
      Entrance(textbox_explainNaive1, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }

  const textbox_explainNaive2 = dataDisplay.querySelector('.text-box-line-group--explain-naive-2 .text-box');
  const connector_explainNaive2 = dataDisplay.querySelector('.text-box-line-group--explain-naive-2 webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  /****************************************************** */
  // EXPLAIN POSSIBILITY THAT JOB IS **NOT** PART OF OPTIMAL SEQUENCE
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain possibility that job is NOT part of optimal sequence',
      jumpTag: 'explain naive p2'
    })
    .addClips([
      Motion(textbox_explainNaive2, '~move-to', [textbox_showNaive, {selfOffset: '-10rem 10rem', targetOffset: '100% 100%', alignment: 'right top'}],
        {duration: 0, commitsStyles: true}),
      Emphasis(algorithm_term2, '~highlight', []),
      ConnectorSetter(connector_explainNaive2, [algorithm_term2, 0.5, 1], [textbox_explainNaive2, 0.5, 0]),
      ConnectorEntrance(connector_explainNaive2, '~trace', ['from-top']),
      Entrance(textbox_explainNaive2, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }

  /****************************************************** */
  // HIDE NAIVE APPROACH EXPLANATIONS
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Hide naive approach explanations',
      autoplaysNextSequence: true,
    })
    .addClips([
      Exit(textbox_explainNaive1, '~fade-out', [], {startsNextClipToo: true}),
      Exit(textbox_explainNaive2, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_explainNaive1, '~trace', ['from-bottom'], {startsNextClipToo: true}),
      ConnectorExit(connector_explainNaive2, '~trace', ['from-bottom'], {startsNextClipToo: true}),
      Emphasis(algorithm_term1, '~un-highlight', [], {startsNextClipToo: true}),
      Emphasis(algorithm_term2, '~un-highlight', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  const textbox_explainNaiveBad = dataDisplay.querySelector('.text-box-line-group--explain-naive-bad .text-box');
  const connector_explainNaiveBad = dataDisplay.querySelector('.text-box-line-group--explain-naive-bad webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  /****************************************************** */
  // EXPLAIN WHY NAIVE APPROACH IS BAD
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain why naive approach is bad',
      jumpTag: 'explain naive bad',
    })
    .addClips([
      Motion(textbox_explainNaiveBad, '~move-to', [textbox_showNaive, {targetOffset: '0% 100%', selfOffset: '0rem 10rem'}],
        {duration: 0, commitsStyles: true}),
      ConnectorSetter(connector_explainNaiveBad, [textbox_showNaive, 0.5, 1], [textbox_explainNaiveBad, 0.5, 0]),
      ConnectorEntrance(connector_explainNaiveBad, '~trace', ['from-top']),
      Entrance(textbox_explainNaiveBad, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  const naiveAlgorithmText = dataDisplay.querySelector('.naive-algorithm-text');
  /****************************************************** */
  // COLLAPSE TEXT BOXES ABOUT THE NAIVE APPROACH
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Collapse text boxes about the naive approach',
      autoplaysNextSequence: true,
    })
    .addClips([
      Exit(naiveAlgorithmText, '~fade-out', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }

  const arrayGroup_j_M = dataDisplay.querySelector('.array-group--j-and-M') as HTMLElement;
  const MArray = arrayGroup_j_M.querySelector('.array--M') as HTMLElement;
  const jArray2 = arrayGroup_j_M.querySelector('.array--j');
  const textbox_MArray = dataDisplay.querySelector('.text-box-line-group--M-array .text-box') as HTMLElement;
  const connector_MArray = dataDisplay.querySelector('.text-box-line-group--M-array webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const paragraph_MArray_explain = textbox_MArray.querySelector('.text-box__paragraph--explain');
  const paragraph_MArray_refArray = textbox_MArray.querySelector('.text-box__paragraph--ref-array');
  /****************************************************** */
  // EXPLAIN MEMOIZATION
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain memoization',
      jumpTag: 'introduce memoization',
    })
    .addClips([
      Entrance(jArray2, '~wipe', ['from-left']),
      Entrance(MArray, '~wipe', ['from-left']),
      Entrance(textbox_MArray, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }

  const arrayBlock_M_0 = MArray.querySelector('.array__array-block--0') as HTMLElement;
  const arrayBlank_M_0 = arrayBlock_M_0.querySelector('.array__array-entry--blank');
  const arrayValue_M_0 = arrayBlock_M_0.querySelector('.array__array-entry--value');
  /****************************************************** */
  // EXPLAIN WHAT M ARRAY WILL BE USED FOR
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Explain what M array will be used for',
    })
    .addClips([
      ConnectorSetter(connector_MArray, [textbox_MArray, 0, 0.5], [MArray, 1, 0.5]),
      ConnectorEntrance(connector_MArray, '~trace', ['from-B']),
      Exit( paragraph_MArray_explain, '~fade-out', [], {duration: 250}),
      Entrance( paragraph_MArray_refArray, '~fade-in', [], {duration: 250}),
      Exit(arrayBlank_M_0, '~fade-out', []),
      Entrance(arrayValue_M_0, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  const textbox_showMemoized = dataDisplay.querySelector('.text-box-line-group--show-memoized .text-box');
  const connector_showMemoized = dataDisplay.querySelector('.text-box-line-group--show-memoized webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  /****************************************************** */
  // SHOW MEMOIZED ALGORITHM
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Show memoized algorithm',
    })
    .addClips([
      Motion(textbox_showMemoized, '~move-to', [textbox_MArray, {targetOffset: '100% 0%', selfOffset: '6.25rem 0rem', preserveY: true}],
        {duration: 0, commitsStyles: true}),
      ConnectorSetter(connector_showMemoized, [textbox_MArray, 1, 0.5], [textbox_showMemoized, 0, 0.5]),
      ConnectorEntrance(connector_showMemoized, '~trace', ['from-A']),
      Entrance( textbox_showMemoized, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  const MArrayTextBoxes = MArray.querySelector('.text-boxes');
  const dataDisplayBorder = dataDisplay.querySelector('.data-display__right-border');
  /****************************************************** */
  // HIDE M ARRAY TEXT EXPLANATION BOXES
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Hide M array text explanation boxes',
      // autoplaysNextSequence: true,
    })
    .addClips([
      Exit(MArrayTextBoxes, '~fade-out', []),
      Entrance(dataDisplayBorder, '~wipe', ['from-top']),
    ]);

    animTimeline.addSequences([animSequence]);
  }
};

// recursively creates animation sequences for the job card tree
function animateJobCard(jobCard: HTMLElement, parentArrowDown: WebChalkTypes.WebChalkConnectorElement, parentArrowSource: Element, aboveBullet: Element): any;
function animateJobCard(jobCard: HTMLElement): any;
function animateJobCard(jobCard: HTMLElement, parentArrowDown?: WebChalkTypes.WebChalkConnectorElement, parentArrowSource?: Element, aboveBullet?: Element) {
  if (!jobCard) { throw new Error('jobCard in animateJobCard() must not be null'); }
  const SJNum = Number.parseInt(jobCard.dataset.sjnum ?? '');
  if (isNaN(SJNum)) { throw new Error(`Invalid SJ number found while reading from a jobCard.dataset.sjnum`); }
  const jobCardContent = jobCard.querySelector('.job-card-content') as HTMLElement;
  const SJNumLabel = jobCardContent.querySelector('.job-card-SJ-num-label');
  const MAccessContainer = jobCard.querySelector('.M-access-container');
  const MAccess = jobCard.querySelector('.M-access');
  const MEntry = jobCard.querySelector('.M-entry');
  const connector_MAccess = jobCard.querySelector('.text-box-line-group--M-access webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_MAccess = jobCard.querySelector('.text-box-line-group--M-access .text-box') as HTMLElement;
  const paragraph_MAccess_intro = textbox_MAccess.querySelector('.text-box__paragraph--intro');
  const paragraph_MAccess_solved = textbox_MAccess.querySelector('.text-box__paragraph--solved');

  const connector_toMBlock = jobCard.querySelector('.connector--M-access-to-M-block') as WebChalkTypes.WebChalkConnectorElement;


  const arrowContainer = jobCard.querySelector('.arrow-container');
  const formulaContainer = jobCard.querySelector('.formula-container');
  const formulaComputation = jobCard.querySelector('.formula-computation');
  const formulaResult = jobCard.querySelector('.formula-result');
  const connector_formulaComputation = jobCard.querySelector('.text-box-line-group--formula-computation webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_formulaComputation = jobCard.querySelector('.text-box-line-group--formula-computation .text-box') as HTMLElement;
  const paragraph_formulaComputation_find = textbox_formulaComputation.querySelector('.text-box__paragraph--find');
  const paragraph_formulaComputation_max = textbox_formulaComputation.querySelector('.text-box__paragraph--max');
  const paragraph_formulaComputation_found = textbox_formulaComputation.querySelector('.text-box__paragraph--found');


  const computation1 = jobCard.querySelector('.computation--1') as HTMLElement;
  const computationResult1 = computation1.querySelector('.computation-result');
  const connector_computation1 = jobCard.querySelector('.text-box-line-group--computation--1 webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_computation1 = jobCard.querySelector('.text-box-line-group--computation--1 .text-box') as HTMLElement;
  const computationExpression1 = jobCard.querySelector('.computation--1 .computation-expression');
  const paragraph_computation1_intro = textbox_computation1.querySelector('.text-box__paragraph--intro');
  const paragraph_computation1_summary = textbox_computation1.querySelector('.text-box__paragraph--summary');
  const cAccessContainer = jobCard.querySelector('.c-access-container');
  const cAccess = jobCard.querySelector('.c-access');
  const cEntry = jobCard.querySelector('.c-entry');
  const connector_cAccess = jobCard.querySelector('.text-box-line-group--c-access webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_cAccess = jobCard.querySelector('.text-box-line-group--c-access .text-box') as HTMLElement;
  const paragraph_cAccess_find = textbox_cAccess.querySelector('.text-box__paragraph--find');
  const paragraph_cAccess_found = textbox_cAccess.querySelector('.text-box__paragraph--found');
  const connector_toCBlock = jobCard.querySelector('.connector--c-access-to-c-block') as WebChalkTypes.WebChalkConnectorElement;
  const OPTExpressionContainer1 = jobCard.querySelector('.computation-expression--1 .OPT-expression-container') as HTMLElement;
  const OPTExpression1 = OPTExpressionContainer1.querySelector('.OPT-expression');
  const OPTResult1 = OPTExpressionContainer1.querySelector('.OPT-result');
  const connector_OPTExpression1 = jobCard.querySelector('.text-box-line-group--OPT-expression-1 webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_OPTExpression1 = jobCard.querySelector('.text-box-line-group--OPT-expression-1 .text-box') as HTMLElement;
  const paragraph_OPTExpression1_find = textbox_OPTExpression1.querySelector('.text-box__paragraph--find');
  const paragraph_OPTExpression1_found = textbox_OPTExpression1.querySelector('.text-box__paragraph--found');


  const computation2 = jobCard.querySelector('.computation--2') as HTMLElement;
  const computationResult2 = computation2.querySelector('.computation-result');
  const OPTExpression2 = computation2.querySelector('.OPT-expression') as HTMLElement;
  const connector_computation2 = jobCard.querySelector('.text-box-line-group--computation--2 webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_computation2 = jobCard.querySelector('.text-box-line-group--computation--2 .text-box') as HTMLElement;
  const paragraph_computation2_intro = textbox_computation2.querySelector('.text-box__paragraph--intro');
  const paragraph_computation2_summary = textbox_computation2.querySelector('.text-box__paragraph--summary');
  const connector_OPTExpression2 = jobCard.querySelector('.text-box-line-group--OPT-expression-2 webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_OPTExpression2 = jobCard.querySelector('.text-box-line-group--OPT-expression-2 .text-box');
  const nextSJNumExpression = computation2.querySelector('.next-SJ-num-expression');
  const nextSJNum = computation2.querySelector('.next-SJ-num');


  const jobCardChild1 = [...(jobCard.querySelector('.job-card-children') as HTMLElement).children][0] as HTMLElement;
  const jobCardChild2 = [...(jobCard.querySelector('.job-card-children') as HTMLElement).children][1] as HTMLElement;


  const MBlock = document.querySelector(`.array--M .array__array-block--${SJNum}`) as HTMLElement;
  const MBlock_blank = MBlock.querySelector(`.array__array-entry--blank`);
  const MBlock_value = MBlock.querySelector(`.array__array-entry--value`);
  const cBlock = document.querySelector(`.array--c .array__array-block--${SJNum}`);


  const connector_upTree = jobCard.querySelector('.connector--up-tree') as WebChalkTypes.WebChalkConnectorElement;
  const connector_downTree = jobCard.querySelector('.connector--down-tree') as WebChalkTypes.WebChalkConnectorElement;
  const jobCardBullet = jobCard.querySelector('.job-card-bullet') as HTMLElement;


  /****************************************************** */
  // FADE IN JOB CARD AND M ACCESS
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Fade in job card and M access',
      jumpTag: 'start',
      autoplays: true,
    });
    if (parentArrowDown && parentArrowSource && aboveBullet) {
      const connector_bulletConnector = jobCard.querySelector('.connector--bullet-connector') as WebChalkTypes.WebChalkConnectorElement;
      animSequence.addClips([
        Entrance(jobCard, '~fade-in', [], {startsNextClipToo: true}),
        ConnectorSetter(parentArrowDown, [parentArrowSource, 0, 1], [SJNumLabel, 0.5, -0.2]),
        ConnectorEntrance(parentArrowDown, '~trace', ['from-A'], {startsNextClipToo: true}),
        Scroller(document.documentElement, '~scroll-self', [jobCardContent, {targetOffset: [0, 0.5], scrollableOffset: [0, 0.5], preserveX: true}], {startsNextClipToo: true}),
        ConnectorSetter(connector_bulletConnector, [aboveBullet, 0.5, 0.5], [jobCardBullet, 0.5, 0.5]),
        ConnectorEntrance(connector_bulletConnector, '~trace', ['from-A'], {startsWithPrevious: true}),
      ]);
    }
    else {
      animSequence.addClips([
        Entrance(jobCard, '~fade-in', []),
      ]);
    }
    animSequence.addClips([
      Entrance(MAccess, '~fade-in', []),
      Emphasis(MAccessContainer, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_MAccess, [MAccess, 0.5, -0.2], [textbox_MAccess, 0.5, 1]),
      ConnectorEntrance(connector_MAccess, '~trace', ['from-A']),
      Entrance(textbox_MAccess, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // POINT TO M BLOCK ARRAY ENTRY
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Point to M block array entry',
    })
    .addClips([
      ConnectorSetter(connector_toMBlock, [MAccessContainer, 0, 0.5], [MBlock, 0.9, 0.5], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_toMBlock, '~trace', ['from-A']),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // FOCUS ON FORMULA CONTAINER
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Focus on formula container',
    })
    .addClips([
      ConnectorExit(connector_toMBlock, '~trace', ['from-B']),
      Exit(textbox_MAccess, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_MAccess, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(MAccessContainer, '~un-highlight', []),

      Entrance(arrowContainer, '~wipe', ['from-right']),
      Entrance(formulaComputation, '~fade-in', []),
      Emphasis(formulaComputation, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_formulaComputation, [formulaComputation, 0.1, 0.2], [textbox_formulaComputation, 0.5, 1]),
      ConnectorEntrance(connector_formulaComputation, '~trace', ['from-A']),
      Entrance(textbox_formulaComputation, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // FOCUS ON COMPUTATION 1
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Focus on computation 1',
    })
    .addClips([
      Exit(textbox_formulaComputation, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_formulaComputation, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(formulaComputation, '~un-highlight', []),

      Emphasis(computationExpression1, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_computation1, [computation1, 0.5, -0.2], [textbox_computation1, 0.5, 1]),
      ConnectorEntrance(connector_computation1, '~trace', ['from-A']),
      Entrance(textbox_computation1, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // FOCUS ON C ACCESS
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Focus on c access',
    })
    .addClips([
      Exit(textbox_computation1, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_computation1, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(computationExpression1, '~un-highlight', [], {startsNextClipToo: true}),
  
      Emphasis(cAccessContainer, '~highlight', []),
      ConnectorSetter(connector_cAccess, [cAccessContainer, 0.5, -0.2], [textbox_cAccess, 0.5, 1], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_cAccess, '~trace', ['from-A']),
      Entrance(textbox_cAccess, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // POINT TO C ARRAY ENTRY
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Point to c array entry',
    })
    .addClips([
      ConnectorSetter(connector_toCBlock, [cAccessContainer, 0, 0.5], [cBlock, 0.9, 0.5], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_toCBlock, '~trace', ['from-A']),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // REVERSE ARROW AND REPLACE C ACCESS WITH VALUE
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Reverse arrow and replace c access with value',
    })
    .addClips([
      ConnectorExit(connector_toCBlock, '~fade-out', []),
      ConnectorSetter(connector_toCBlock, [cBlock, 0.9, 0.5], [cAccessContainer, 0, 0.5], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_toCBlock, '~trace', ['from-A']),
      Exit(cAccess, '~wipe', ['from-right']),
      Entrance(cEntry, '~wipe', ['from-right']),

      // SetConnector(connector_cAccess, [cAccessContainer, 0.5, -0.2], [textbox_cAccess, 0.5, 1]),
      // DrawConnector(connector_cAccess, '~fade-in', [], {duration: 0}),
      Exit(paragraph_cAccess_find, '~fade-out', [], { duration: 250 }),
      Entrance(paragraph_cAccess_found, '~fade-in', [], { duration: 250 }),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // FOCUS ON OPT EXPRESSION 1 AS A WHOLE
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Focus on OPT expression 1 as a whole',
    })
    .addClips([
      // hide arrow for c block
      ConnectorExit(connector_toCBlock, '~fade-out', []),
  
      // remove c access text
      Exit(textbox_cAccess, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_cAccess, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(cAccessContainer, '~un-highlight', []),
  
      // enter OPT expression 1 text
      Emphasis(OPTExpressionContainer1, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_OPTExpression1, [OPTExpressionContainer1, 0.5, -0.2], [textbox_OPTExpression1, 0.5, 1]),
      ConnectorEntrance(connector_OPTExpression1, '~trace', ['from-A']),
      Entrance(textbox_OPTExpression1, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }

  /****************************************************** */
  // RECURSION 1
  /****************************************************** */
  const jobCardChild1Content = jobCardChild1.querySelector('.job-card-content') as HTMLElement;
  const connector_upFromChild1 = jobCardChild1Content.querySelector('.connector--up-tree') as WebChalkTypes.WebChalkConnectorElement;
  const MAccessContainer_fromChild1 = jobCardChild1Content.querySelector('.M-access-container');
  {
    const animSeqPassDown = webchalk.newSequence({autoplaysNextSequence: true});
    // add blocks to hide text about OPT expression before recursion
    animSeqPassDown.addClips([
      Exit(textbox_OPTExpression1, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_OPTExpression1, '~trace', ['from-B']),
    ]);
    animTimeline.addSequences([animSeqPassDown]);
    // generate animation sequences for first child job/stub
    jobCardChild1.classList.contains('job-card--stub') ?
      animateJobStub(jobCardChild1, connector_downTree, OPTExpressionContainer1, jobCardBullet) :
      animateJobCard(jobCardChild1, connector_downTree, OPTExpressionContainer1, jobCardBullet);
    /****************************************************** */
    // REPLACE OPT1 EXPRESSION WITH ANSWER, CHANGE TEXT BOX TEXT
    /****************************************************** */
    const animSequence = webchalk.newSequence({
      description: 'Replace OPT1 expression with answer, change text box text',
      jumpTag: 'OPT point 1',
    })
    .addClips([
      ConnectorSetter(connector_upFromChild1, [MAccessContainer_fromChild1, 0.5, -0.2], [OPTExpressionContainer1, 0, 1.1]),
      ConnectorEntrance(connector_upFromChild1, '~trace', ['from-A']),
      Scroller(document.querySelector('html'), '~scroll-self', [jobCardContent, {targetOffset: [0, 0.5], scrollableOffset: [0, 0.5], preserveX: true}], {startsWithPrevious: true}),
      Exit(OPTExpression1, '~wipe', ['from-right']),
      Entrance(OPTResult1, '~wipe', ['from-right'], {startsNextClipToo: true}),
      Exit(paragraph_OPTExpression1_find, '~fade-out', [], { duration: 250 }),
      Entrance(paragraph_OPTExpression1_found, '~fade-in', [], { duration: 250 }),
      ConnectorSetter(connector_OPTExpression1, [OPTResult1, 0.5, -0.2], [textbox_OPTExpression1, 0.5, 1]),
      ConnectorEntrance(connector_OPTExpression1, '~trace', ['from-A']),
      Entrance(textbox_OPTExpression1, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }
  

  /****************************************************** */
  // REMOVE ARROW COMING FROM CHILD, HIDE CURRENT TEXT; REPLACE COMPUTATION EXPRESSION WITH ANSWER; AND FOCUS ON WHOLE COMPUTATION1 (SWAP TEXT AS WELL)
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: `Remove arrow coming from child, hide current text, replace computation expression with answer, and focus on whole computation1 (swap text as well)`,
    })
    .addClips([
      ConnectorExit(connector_upFromChild1, '~fade-out', [], {startsNextClipToo: true}),
      Exit(textbox_OPTExpression1, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_OPTExpression1, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(OPTExpressionContainer1, '~un-highlight', []),
  
      Exit(paragraph_computation1_intro, '~disappear', []),
      Entrance(paragraph_computation1_summary, '~appear', []),
      Exit(computationExpression1, '~wipe', ['from-right'],),
      Entrance(computationResult1, '~wipe', ['from-right'],),
      Emphasis(computationResult1, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_computation1, [computationResult1, 0.5, -0.2], [textbox_computation1, 0.5, 1]),
      ConnectorEntrance(connector_computation1, '~trace', ['from-A']),
      Entrance(textbox_computation1, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // FOCUS ON COMPUTATION 2
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Focus on computation 2',
      jumpTag: 'focus comp 2',
    })
    .addClips([
      Exit(textbox_computation1, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_computation1, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(computationResult1, '~un-highlight', []),

      Emphasis(computation2, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_computation2, [computation2, 0.5, -0.2], [textbox_computation2, 0.5, 1]),
      ConnectorEntrance(connector_computation2, '~trace', ['from-A']),
      Entrance(textbox_computation2, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // REPLACE SUBTRACTION WITH RESULT; THEN FOCUS ON OPT EXPRESSION 2
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Replace subtraction with result; then focus on OPT expression 2'
    })
    .addClips([
      Exit(textbox_computation2, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_computation2, '~trace', ['from-B'], {startsNextClipToo: true}),
  
      Exit(nextSJNumExpression, '~wipe', ['from-right']),
      Entrance(nextSJNum, '~wipe', ['from-right']),
  
      ConnectorSetter(connector_OPTExpression2, [computation2, 0.5, -0.2], [textbox_OPTExpression2, 0.5, 1]),
      ConnectorEntrance(connector_OPTExpression2, '~trace', ['from-A']),
      Entrance(textbox_OPTExpression2, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // RECURSION 2
  /****************************************************** */
  const jobCardChild2Content = jobCardChild2.querySelector('.job-card-content') as HTMLElement;
  const connector_upFromChild2 = jobCardChild2Content.querySelector('.connector--up-tree') as WebChalkTypes.WebChalkConnectorElement;
  const MAccessContainer_fromChild2 = jobCardChild2Content.querySelector('.M-access-container');
  {
    const animSeqPassDown = webchalk.newSequence({
      autoplaysNextSequence: true,
    })
    .addClips([
      Exit(textbox_OPTExpression2, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_OPTExpression2, '~trace', ['from-B']),
    ]);
    animTimeline.addSequences([animSeqPassDown]);
    // create animation sequences for second child card/stub
    jobCardChild2.classList.contains('job-card--stub') ?
      animateJobStub(jobCardChild2, connector_downTree, OPTExpression2, jobCardChild1.querySelector('.job-card-bullet') as HTMLElement) :
      animateJobCard(jobCardChild2, connector_downTree, OPTExpression2, jobCardChild1.querySelector('.job-card-bullet') as HTMLElement);
    /****************************************************** */
    // REPLACE OPT2 EXPRESSION WITH ANSWER, HIDE OLD TEXT, AND ADD COMPUTATION 2 TEXT WITH SWAPPED TEXT
    /****************************************************** */
    const animSequence = webchalk.newSequence({
      description: 'Replace OPT2 expression with answer, hide old text, and add computation 2 text with swapped text',
    })
    .addClips([
      ConnectorSetter(connector_upFromChild2, [MAccessContainer_fromChild2, 0.5, -0.2], [computation2, 0, 1.1]),
      ConnectorEntrance(connector_upFromChild2, '~trace', ['from-A']),
      Scroller(document.querySelector('html'), '~scroll-self', [jobCardContent, {targetOffset: [0, 0.5], scrollableOffset: [0, 0.5], preserveX: true}], {startsWithPrevious: true}),

      Exit(paragraph_computation2_intro, '~disappear', []),
      Entrance(paragraph_computation2_summary, '~appear', []),

      Emphasis(computation2, '~un-highlight', [], {startsNextClipToo: true}),
      Exit(OPTExpression2, '~wipe', ['from-right']),
      Entrance(computationResult2, '~wipe', ['from-right'], {startsNextClipToo: true}),
      Emphasis(computationResult2, '~highlight', []),

      ConnectorSetter(connector_computation2, [computation2, 0.5, -0.2], [textbox_computation2, 0.5, 1]),
      ConnectorEntrance(connector_computation2, '~trace', ['from-A']),
      Entrance(textbox_computation2, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }
  

  /****************************************************** */
  // FOCUS ON WHOLE FORMULA CONTAINER
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Focus on whole formula container',
    })
    .addClips([
      ConnectorExit(connector_upFromChild2, '~fade-out', []),
      Exit(textbox_computation2, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_computation2, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(computationResult2, '~un-highlight', []),

      
      Exit(paragraph_formulaComputation_find, '~disappear', []),
      Entrance(paragraph_formulaComputation_max, '~appear', []),
      Emphasis(formulaContainer, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_formulaComputation, [formulaContainer, 0.5, 0], [textbox_formulaComputation, 0.5, 1], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_formulaComputation, '~trace', ['from-A']),
      Entrance(textbox_formulaComputation, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // REPLACE FORMULA CONTAINER CONTENTS WITH FINAL ANSWER
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Replace formula container contents with final answer',
      jumpTag: 'replace formula container contents',
    })
    .addClips([
      Exit(formulaComputation, '~wipe', ['from-right']),
      Entrance(formulaResult, '~wipe', ['from-right'], {startsNextClipToo: true}),
  
      Exit(paragraph_formulaComputation_max, '~fade-out', [], { duration: 250 }),
      Entrance(paragraph_formulaComputation_found, '~fade-in', [], { duration: 250 }),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // SHOW ONLY M CONTAINER, REPLACE M ACCESS WITH FINAL COMPUTED OPTIMAL VALUE, AND UPDATE M ARRAY BLOCK
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Show only M container, replace M access with final computed optimal value, and update M array block',
      jumpTag: 'found max',
    })
    .addClips([
      // hide formula container
      Exit(textbox_formulaComputation, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_formulaComputation, '~trace', ['from-B'], {startsNextClipToo: true}),
      Emphasis(formulaContainer, '~un-highlight', [], {startsNextClipToo: true}),
      Exit(formulaContainer, '~wipe', ['from-right']),
      Exit(arrowContainer, '~wipe', ['from-right']),
  
      // Visually update M access to final answer
      Exit(MAccess, '~wipe', ['from-right']),
      Entrance(MEntry, '~wipe', ['from-right']),
      Emphasis(MAccessContainer, '~highlight', []),
  
      // Visually update M array entry
      ConnectorSetter(connector_toMBlock, [MAccessContainer, 0, 0.5], [MBlock, 0.9, 0.5], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_toMBlock, '~trace', ['from-right']),
      Exit(MBlock_blank, '~fade-out', []),
      Entrance(MBlock_value, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // REMOVE ARROW POINTING FROM M BLOCK AND SHOW FINAL TEXT BOX
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Remove arrow pointing from M block and show final text box',
    })
    .addClips([
      // Add last text box
      Exit(paragraph_MAccess_intro, '~disappear', []),
      Entrance(paragraph_MAccess_solved, '~appear', []),
      ConnectorExit(connector_toMBlock, '~trace', ['from-left']),
      ConnectorSetter(connector_MAccess, [MAccessContainer, 0.5, -0.2], [textbox_MAccess, 0.5, 1], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_MAccess, '~trace', ['from-A']),
      Entrance(textbox_MAccess, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // IF THIS IS A CHILD, ADD BLOCKS FOR HIDING PARENT ARROW BEFORE GOING BACK UP RECURSION TREE
  /****************************************************** */
  if (parentArrowDown) {
    // just for hiding the last text box before moving back up the tree
    const animSequence = webchalk.newSequence({
      description: 'If this is child block, hide parent arrow and unhighlight M access',
      jumpTag: 'finish a main card',
      autoplaysNextSequence: true,
    })
    .addClips([
      Exit(textbox_MAccess, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_MAccess, '~trace', ['from-B']),
      ConnectorExit(parentArrowDown, '~fade-out', [], {startsNextClipToo: true}),
      Emphasis(MAccessContainer, '~un-highlight', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }
};

// terminal function that creates the animation sequences for job stubs (which are leaves of the job card tree)
function animateJobStub(jobCard: HTMLElement, parentArrowDown: WebChalkTypes.WebChalkConnectorElement, parentArrowSource: HTMLElement, aboveBullet: HTMLElement) {
  if (!jobCard) { throw new Error('jobCard in animateJobStub() must not be null'); }
  const SJNum = Number.parseInt(jobCard.dataset.sjnum ?? '');
  const jobCardContent = jobCard.querySelector('.job-card-content') as HTMLElement;
  const SJNumLabel = jobCardContent.querySelector('.job-card-SJ-num-label');
  const MAccessContainer = jobCard.querySelector('.M-access-container');
  const MAccess = jobCard.querySelector('.M-access');
  const MEntry = jobCard.querySelector('.M-entry');
  const connector_MAccess = jobCard.querySelector('.text-box-line-group--M-access webchalk-connector') as WebChalkTypes.WebChalkConnectorElement;
  const textbox_MAccess = jobCard.querySelector('.text-box-line-group--M-access .text-box');
  const textbox_MAccess_p1 = jobCard.querySelector('.text-box-line-group--M-access .text-box .text-box__paragraph--1');
  const textbox_MAccess_p2 = jobCard.querySelector('.text-box-line-group--M-access .text-box .text-box__paragraph--2');
  const connector_toMBlock = jobCard.querySelector('.connector--M-access-to-M-block') as WebChalkTypes.WebChalkConnectorElement;


  const MBlock = document.querySelector(`.array--M .array__array-block--${SJNum}`);

  
  const connector_bulletConnector = jobCard.querySelector('.connector--bullet-connector') as WebChalkTypes.WebChalkConnectorElement;
  const connector_upTree = jobCard.querySelector('.connector--up-tree');
  const jobCardBullet = jobCard.querySelector('.job-card-bullet');


  /****************************************************** */
  // FADE IN JOB STUB AND M ACCESS
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Fade in job stub and M access',
    })
    .addClips([
      Entrance(jobCard, '~fade-in', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_bulletConnector, [aboveBullet, 0.5, 0.5], [jobCardBullet, 0.5, 0.5]),
      ConnectorEntrance(connector_bulletConnector, '~trace', ['from-A'], {startsNextClipToo: true}),
      Scroller(document.documentElement, '~scroll-self', [jobCardContent, {targetOffset: [0, 0.5], scrollableOffset: [0, 0.5], preserveX: true}], {startsNextClipToo: true}),
      ConnectorSetter(parentArrowDown, [parentArrowSource, 0, 1], [SJNumLabel, 0.5, -0.2]),
      ConnectorEntrance(parentArrowDown, '~trace', ['from-A'], {startsWithPrevious: true}),
      Entrance(MAccess, '~fade-in', []),
      Emphasis(MAccessContainer, '~highlight', [], {startsNextClipToo: true}),
      ConnectorSetter(connector_MAccess, [MAccessContainer, 0.5, -0.2], [textbox_MAccess, 0.5, 1]),
      ConnectorEntrance(connector_MAccess, '~trace', ['from-A']),
      Entrance(textbox_MAccess, '~fade-in', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // POINT TO M BLOCK ARRAY ENTRY
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Point to M block array entry',
    })
    .addClips([
      ConnectorSetter(connector_toMBlock, [MAccessContainer, 0, 0.5], [MBlock, 0.9, 0.5], {pointTrackingEnabled: true}),
      ConnectorEntrance(connector_toMBlock, '~trace', ['from-A']),
    ]);

    animTimeline.addSequences([animSequence]);
  }
  

  /****************************************************** */
  // POINT BACK TO M ACCESS FROM M BLOCK
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Point back to M access from M block',
    })
    .addClips([
      ConnectorExit(connector_toMBlock, '~fade-out', []),
      ConnectorSetter(connector_toMBlock, [MBlock, 0.9, 0.5], [MAccessContainer, 0, 0.5]),
      ConnectorEntrance(connector_toMBlock, '~trace', ['from-A']),
      Exit(MAccess, '~wipe', ['from-right']),
      Entrance(MEntry, '~wipe', ['from-right']),
      Exit(textbox_MAccess_p1, '~fade-out', [], {duration: 250, startsNextClipToo: true}),
      Entrance(textbox_MAccess_p2, '~fade-in', [], {duration: 250, startsNextClipToo: true, delay: 250}),
    ]);

    animTimeline.addSequences([animSequence]);
  }


  /****************************************************** */
  // RETURN BLOCK THAT INITIALLY HIDES REMAINING STUFF AND POINTS TO PARENT
  /****************************************************** */
  {
    const animSequence = webchalk.newSequence({
      description: 'Hide parent arrow and unhighlight M access',
      autoplaysNextSequence: true,
    })
    .addClips([
      ConnectorExit(connector_toMBlock, '~fade-out', [], {startsNextClipToo: true}),
      ConnectorExit(connector_MAccess, '~trace', ['from-B'], {startsNextClipToo: true}),
      Exit(textbox_MAccess, '~fade-out', []),
      ConnectorExit(parentArrowDown, '~fade-out', [], {startsNextClipToo: true}),
      Emphasis(MAccessContainer, '~un-highlight', []),
    ]);

    animTimeline.addSequences([animSequence]);
  }
};



// const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// wait(5000).then(async () => {
//   await animTimeline.step('forward');
//   await wait(1000);
//   animTimeline.step('backward');
//   await wait(200);
//   animTimeline.togglePause();
//   await wait(1000);
//   animTimeline.togglePause();
//   animTimeline.toggleSkipping();
//   await wait(500);

//   console.time('JUMPING');
//   await animTimeline.jumpToPosition('end', {targetOffset: 0});
//   console.timeEnd('JUMPING');
//   await wait(500);
//   console.time('JUMPING-2');
//   await animTimeline.jumpToPosition('beginning', {targetOffset: 0});
//   console.timeEnd('JUMPING-2');
//   await wait(500);
//   console.time('JUMPING');
//   await animTimeline.jumpToPosition('end', {targetOffset: 0});
//   console.timeEnd('JUMPING');
//   await wait(500);
//   console.time('JUMPING-2');
//   await animTimeline.jumpToPosition('beginning', {targetOffset: 0});
//   console.timeEnd('JUMPING-2');
// })



  // // animTimeline.skipTo('focus comp 2');
  // // animTimeline.skipTo('found max');
  // // animTimeline.skipTo('OPT point 1');
  // // animTimeline.skipTo('start');
  // // animTimeline.skipTo('finish a main card');
  // // animTimeline.skipTo('replace formula container contents');
  // // animTimeline.skipTo('explain naive');
  // // animTimeline.skipTo('introduce memoization');

  // // skips to tag and checks to see if DISABLED_FROM_EDGE should be added or removed from forward/backward buttons
  // const skipTo = (jumpTag: string, offset: number) => {
  //   animTimeline.skipTo(tag, offset)
  //   .then(() => {
  //     // if (animTimeline.atBeginning) { backwardButton.classList.add(DISABLED_FROM_EDGE); }
  //     // else { backwardButton.classList.remove(DISABLED_FROM_EDGE); }

  //     // if (animTimeline.atEnd) { forwardButton.classList.add(DISABLED_FROM_EDGE); }
  //     // else { forwardButton.classList.remove(DISABLED_FROM_EDGE); }
  //   })
  // };

  // // skipTo('start');
