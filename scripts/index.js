import { enableButton, disableButton } from './utility.js';
import { createForm_multiInput, createForm_textarea } from './jobForm.js';
import { AnimSequence } from './AnimSequence.js';

const maxNumJobs = 8;
const maxTime = 11;
const maxWeight = 99;

(function() {
  const mainMenu = document.querySelector('.main-menu');
  const maxJobsEl = mainMenu.querySelector('.fill--max-jobs');
  const maxTimeEl = mainMenu.querySelector('.fill--max-time');
  const maxWeightEl = mainMenu.querySelector('.fill--max-weight');

  maxJobsEl.value = maxNumJobs;
  maxTimeEl.value = maxTime;
  maxWeightEl.value = maxWeight;
})();

const jobForm_multiInput = document.querySelector('.job-form--multi-input');
const jobForm_textarea = document.querySelector('.job-form--textarea');
const toggleFormButton_toTA = document.querySelector('.job-form__button--toggle-form--TA');
const toggleFormButton_toMI = document.querySelector('.job-form__button--toggle-form--MI');
disableButton(toggleFormButton_toMI);

toggleFormButton_toTA.addEventListener('click', swapForm);
toggleFormButton_toMI.addEventListener('click', swapForm);

const constraintOptions = { maxNumJobs, maxTime, maxWeight };
const {enableForm: enableForm_MI, disableForm: disableForm_MI} = createForm_multiInput(constraintOptions);
const {enableForm: enableForm_TA, disableForm: disableForm_TA} = createForm_textarea(constraintOptions);

const toggleSequence = new AnimSequence([
  [ 'std', jobForm_multiInput, 'exit-wipe-to-left', { duration: 250 } ],
  [ 'std', jobForm_textarea, 'enter-wipe-from-right', { duration: 250 } ],
]);

function swapForm(e) {
  const toggleButton = e.target;
  disableButton(toggleButton); // disable currently pressed button

  // switch from multi-input form to textarea form
  if (toggleButton === toggleFormButton_toTA) {
    disableForm_MI(); // disable multi-input form
    toggleSequence.play().then(() => { // play animation to swap forms
      enableForm_TA(); // enable textarea form
      enableButton(toggleFormButton_toMI); // enable button to switch back to multi-input form
    });
  }
  // switch from textarea form to multi-input form
  if (toggleButton === toggleFormButton_toMI) {
    disableForm_TA();
    toggleSequence.rewind().then(() => {
      enableForm_MI();
      enableButton(toggleFormButton_toTA);
    });
  }
}
