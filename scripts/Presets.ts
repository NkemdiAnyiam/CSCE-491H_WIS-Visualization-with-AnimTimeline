import { EmphasisBlock, EntranceBlock, ExitBlock, TElem, TNoElem, TranslationBlock } from "./AnimBlock.js"; // TODO: Clean up TElem/TNoElem import
import { DrawConnectorBlock, EraseConnectorBlock } from "./AnimBlockLine.js";
import { IKeyframesBank } from "./TestUsability/WebFlik.js";

// type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }


const negate = (str: string) => {
  return str[0] === '-' ? str.slice(1) : `-${str}`;
}

export const presetEntrances = {
  [`~fade-in`]: {
    generateKeyframes: () => [[
      {opacity: '0'},
      {opacity: '1'},
    ]],
  },

  [`~wipe`]: {
    generateKeyframes(direction: 'from-bottom' | 'from-left' | 'from-top' | 'from-right' = 'from-bottom') {
      switch(direction) {
        case 'from-bottom':
          return [[
            {clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)'},
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
          ]];

        case 'from-left':
          return [[
            {clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)'},
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
          ]];

        case 'from-top':
          return [[
            {clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)'},
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
          ]];

        case 'from-right':
          return [[
            {clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)'},
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
          ]];

        default:
          throw new Error(`Invalid direction ${direction} used in ~wipe. Must be 'from-top', 'from-right', 'from-bottom', or 'from-left'`);
      }
    }
  },

  // invalidProperty: 5,
} satisfies IKeyframesBank<EntranceBlock>;


export const presetExits = {
  [`~fade-out`]: {
    generateKeyframes: () => [[
      {opacity: '1'},
      {opacity: '0'},
    ]],
  },
  
  [`~wipe`]: {
    generateKeyframes(direction: 'from-bottom' | 'from-left' | 'from-top' | 'from-right' = 'from-bottom') {
      switch(direction) {
        case 'from-bottom':
          return [[
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
            {clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)'},
          ]];

        case 'from-left':
          return [[
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
            {clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)'},
          ]];

        case 'from-top':
          return [[
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
            {clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)'},
          ]];

        case 'from-right':
          return [[
            {clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'},
            {clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)'},
          ]];

        default:
          throw new Error(`Invalid direction ${direction} used in ~wipe. Must be 'from-top', 'from-right', 'from-bottom', or 'from-left'`);
      }
    }
  },
} satisfies IKeyframesBank<ExitBlock>;


export const presetEmphases = {
  [`~highlight`]: {
    generateKeyframes: () =>  [[
      {backgroundPositionX: '100%'},
      {backgroundPositionX: '0%'},
    ]],
    config: {
      classesToAddOnStart: [`highlightable`],
      // invalidProp: 4,
    },
  },

  [`~un-highlight`]: {
    generateKeyframes: () =>  [[
      {backgroundPositionX: '0'},
      {backgroundPositionX: '100%'},
    ]],
    config: {
      classesToRemoveOnFinish: [`highlightable`],
    },
  },
} satisfies IKeyframesBank<EmphasisBlock>;

// TODO: Implement composite: accumulates somewhewre
export const presetTranslations = {
  ['~translate']: {
    generateKeyframes: (translationOptions: Partial<TNoElem>): [Keyframe[], Keyframe[]] => {
      const {
        translateX = '0px',
        translateY = '0px',
        offsetSelfX = '0px',
        offsetSelfY = '0px',
      } = translationOptions;
      
      return [
        // forward
        [{translate: `calc(${translateX} + ${offsetSelfX}) calc(${translateY} + ${offsetSelfY})`}],
  
        // backward
        [{translate: `calc(${negate(translateX)} + ${negate(offsetSelfX)}) calc(${negate(translateY)} + ${negate(offsetSelfY)})`}],
      ];
    },
  },

  ['~move-to']: {
    generateKeyframes(targetElem: Element | null, translationOptions: Partial<TElem> = {}) {
      if (!targetElem) {
        throw new Error(`Target for ~move-to must not be null`); // TODO: Improve error message
      }

      const {
        alignmentX = 'left',
        alignmentY = 'top',
        offsetSelfX = '0px',
        offsetSelfY = '0px',
        offsetTargetX = 0,
        offsetTargetY = 0,
        preserveX = false,
        preserveY = false,
      } = translationOptions;
      
      // get the bounding boxes of our DOM element and the target element
      // TODO: Find better spot for visibility override
      this.domElem.classList.value += ` wbfk-override-hidden`;
      targetElem.classList.value += ` wbfk-override-hidden`;
      const rectThis = this.domElem.getBoundingClientRect();
      const rectTarget = targetElem.getBoundingClientRect();
      this.domElem.classList.value = this.domElem.classList.value.replace(` wbfk-override-hidden`, '');
      targetElem.classList.value = targetElem.classList.value.replace(` wbfk-override-hidden`, '');

      // the displacement will start as the difference between the target element's position and our element's position...
      // ...plus any offset with respect to the target
      const translateX: number = (preserveX ? 0 : rectTarget[alignmentX] - rectThis[alignmentX])
        + offsetTargetX * rectTarget.width;
      const translateY: number = (preserveY ? 0 : rectTarget[alignmentY] - rectThis[alignmentY])
        + offsetTargetY * rectTarget.height;
      
      return [
        // forward
        // TODO: Support returning singular Keyframe instead of Keyframe[]
        [{translate: `calc(${translateX}px + ${offsetSelfX}) calc(${translateY}px + ${offsetSelfY})`}],

        // backward
        [{translate: `calc(${-translateX}px + ${negate(offsetSelfX)}) calc(${-translateY}px + ${negate(offsetSelfY)})`}],
      ];
    },
  },
} satisfies IKeyframesBank<TranslationBlock>; 

export const presetConnectorEntrances = {
  [`~trace`]: {
    generateKeyframes(direction: 'from-A' | 'from-B' | 'from-top' | 'from-bottom' | 'from-left' | 'from-right' = 'from-A') {
      const markerIdPrefix = this.connectorElem.markerIdPrefix;

      // using CSS variables to control marker-end or marker-start with easing step-end
      // makes it possible to instantly hide a marker and re-reveal it at the end
      const fromAFrames = [
        {['--b-marker']: `url(#${markerIdPrefix}-b--layer--hide-by-invalidating)`, easing: 'step-end'},
        {strokeDashoffset: 1, offset: 0},
        {strokeDashoffset: 0, offset: 1},
        {['--b-marker']: `url(#${markerIdPrefix}-b--layer)`},
      ];

      const fromBFrames = [
        {['--a-marker']: `url(#${markerIdPrefix}-a--layer--hide-by-invalidating)`, easing: 'step-end'},
        {strokeDashoffset: -1, offset: 0},
        {strokeDashoffset: 0, offset: 1},
        {['--a-marker']: `url(#${markerIdPrefix}-a--layer)`},
      ];

      switch(direction) {
        case 'from-A':
          return [fromAFrames];

        case 'from-B':
          return [fromBFrames];

        case 'from-top':
          return [this.connectorElem.ay <= this.connectorElem.by ? fromAFrames : fromBFrames];

        case 'from-bottom':
          return [this.connectorElem.ay >= this.connectorElem.by ? fromAFrames : fromBFrames];

        case 'from-left':
          return [this.connectorElem.ax <= this.connectorElem.bx ? fromAFrames : fromBFrames];

        case 'from-right':
          return [this.connectorElem.ax >= this.connectorElem.bx ? fromAFrames : fromBFrames];

        default:
          throw new Error(`Invalid direction ${direction} used in ~trace. Must be 'from-A', 'from-B', 'from-top', 'from-bottom', 'from-left', or 'from-right'`);
      }
    },
  },

  [`~fade-in`]: {
    generateKeyframes: () => [[
      {opacity: '0'},
      {opacity: '1'},
    ]],
  },
} satisfies IKeyframesBank<DrawConnectorBlock>;

export const presetConnectorExits = {
  [`~trace`]: {
    generateKeyframes(direction: 'from-A' | 'from-B' | 'from-top' | 'from-bottom' | 'from-left' | 'from-right' = 'from-A') {
      const markerIdPrefix = this.connectorElem.markerIdPrefix;

      const fromStartFrames = [
        {['--a-marker']: `url(#${markerIdPrefix}-a--layer)`, easing: 'step-start'},
        {strokeDashoffset: 0, offset: 0},
        {strokeDashoffset: -1, offset: 1},
        {['--a-marker']: `url(#${markerIdPrefix}-a--layer--hide-by-invalidating)`},
      ];

      const fromEndFrames = [
        {['--b-marker']: `url(#${markerIdPrefix}-b--layer)`, easing: 'step-start'},
        {strokeDashoffset: 0, offset: 0},
        {strokeDashoffset: 1, offset: 1},
        {['--b-marker']: `url(#${markerIdPrefix}-b--layer--hide-by-invalidating)`},
      ];

      switch(direction) {
        case 'from-A':
          return [fromStartFrames];

        case 'from-B':
          return [fromEndFrames];

        case 'from-top':
          return [this.connectorElem.ay <= this.connectorElem.by ? fromStartFrames : fromEndFrames];

        case 'from-bottom':
          return [this.connectorElem.ay >= this.connectorElem.by ? fromStartFrames : fromEndFrames];

        case 'from-left':
          return [this.connectorElem.ax <= this.connectorElem.bx ? fromStartFrames : fromEndFrames];

        case 'from-right':
          return [this.connectorElem.ax >= this.connectorElem.bx ? fromStartFrames : fromEndFrames];

        default:
          throw new Error(`Invalid direction ${direction} used in ~trace. Must be 'from-A', 'from-B', 'from-top', 'from-bottom', 'from-left', or 'from-right'`);
      }
    },
  },

  [`~fade-out`]: {
    generateKeyframes: () => [[
      {opacity: '1'},
      {opacity: '0'},
    ]],
  },
} satisfies IKeyframesBank<EraseConnectorBlock>;
