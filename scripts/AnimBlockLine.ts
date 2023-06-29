import { AnimBlock, AnimBlockConfig, AnimTimelineAnimation, EntranceBlock } from "./AnimBlock.js";
import { AnimBlockLineUpdater } from "./AnimBlockLineUpdater.js";
import { AnimationNameIn, IKeyframesBank, KeyframeBehaviorGroup } from "./TestUsability/WebFlik.js";

type ConnectorConfig = {
  trackEndpoints: boolean;
};

export class Connector extends HTMLElement {
  static staticId: number = 0;

  private connectorId: number = 0;
  useEndMarker: boolean;
  useStartMarker: boolean;
  private lineLayer: SVGLineElement;
  private lineMask: SVGLineElement;
  private gBody: SVGGElement;

  startPoint?: [startElem: Element, leftOffset: number, topOffset: number];
  endPoint?: [endElem: Element, leftOffset: number, topOffset: number];
  tracking: boolean = false;
  private trackingTimeout?: NodeJS.Timer;

  set x1(val: number) {
    this.lineLayer.x1.baseVal.value = val;
    this.lineMask.x1.baseVal.value = val;
  }
  set x2(val: number) {
    this.lineLayer.x2.baseVal.value = val;
    this.lineMask.x2.baseVal.value = val;
  }
  set y1(val: number) {
    this.lineLayer.y1.baseVal.value = val;
    this.lineMask.y1.baseVal.value = val;
  }
  set y2(val: number) {
    this.lineLayer.y2.baseVal.value = val;
    this.lineMask.y2.baseVal.value = val;
  }

  getBoundingClientRect() {
    return this.gBody.getBoundingClientRect();
  }

  // TODO: Add lifecycle callbacks
  
  constructor() {
    super();
    this.connectorId = Connector.staticId++;
    const shadow = this.attachShadow({mode: 'open'});

    const markerId = `markerArrow--${this.connectorId}`;
    const maskId = `mask--${this.connectorId}`;
    this.useEndMarker = this.hasAttribute('end-marker');
    this.useStartMarker = this.hasAttribute('start-marker');

    this.classList.add('markers-hidden'); // TODO: Find better solution

    // <link rel="preload" href="/scripts/TestUsability/line-styles.css" as="style" />

    const htmlString = `
    <style>
      :host {
        display: inline-block;
        color: black;
        stroke-linecap: round;
        line-height: 0 !important;
        overflow: visible !important;
        stroke-width: 2;
        /* visibility: hidden; */
      }

      :host(.markers-hidden) marker {
        visibility: hidden;
      }
      
      .connector__svg {
        visibility: hidden;
        width: auto;
        height: auto;
        position: absolute;
        top: 0;
        left: 0;
        /* pointer-events: none; */
        overflow: visible !important;
        z-index: 1000;
      }
      
      .connector__g-body {
        visibility: initial;
      }
      
      .connector__mask-group {
        color: white !important;
        stroke: currentColor !important;
        fill: currentColor !important;
      }
      
      .connector__layer-group {
        
      }
      
      .connector__line--mask {
        stroke-dashoffset: 0 !important;
      }
      
      .connector__line--layer {
        stroke: currentColor !important;
        stroke-dasharray: 1 !important;
      }
      
      marker {
        fill: currentColor !important;
      }
      
      /*marker.hidden {
        visibility: hidden;
      }*/
    </style>

      <svg class="connector__svg">
        <g class="connector__g-body">
          <mask id="${maskId}">
            <g class="connector__mask-group">
              ${
                this.useStartMarker ?
                `<marker id="${markerId}-start-mask" markerWidth="6" markerHeight="8" refX="5" refY="4" orient="auto-start-reverse">
                  <path d="M0,0 L0,8 L6,4 L0,0" />
                </marker>` :
                ''
              }
              ${
                this.useEndMarker ?
                `<marker id="${markerId}-end-mask" markerWidth="6" markerHeight="8" refX="5" refY="4" orient="auto">
                  <path d="M0,0 L0,8 L6,4 L0,0" />
                </marker>` :
                ''
              }

              <line
                ${this.useStartMarker ? `marker-start="url(#${markerId}-start-mask)"` : ''}
                ${this.useEndMarker ? `marker-end="url(#${markerId}-end-mask)"` : ''}
                class="connector__line connector__line--mask"
              />
            </g>
          </mask>

          <g mask="url(#${maskId})" class="connector__layer-group">
            ${
              this.useStartMarker ?
              `<marker id="${markerId}-start-layer" markerWidth="6" markerHeight="8" refX="5" refY="4" orient="auto-start-reverse">
                <path d="M0,0 L0,8 L6,4 L0,0" />
              </marker>` :
              ''
            }
            ${
              this.useEndMarker ?
              `<marker id="${markerId}-end-layer" markerWidth="6" markerHeight="8" refX="5" refY="4" orient="auto">
                <path d="M0,0 L0,8 L6,4 L0,0" />
              </marker>` :
              ''
            }

            <line
              ${this.useStartMarker ? `marker-start="url(#${markerId}-start-layer)"` : ''}
              ${this.useEndMarker ? `marker-end="url(#${markerId}-end-layer)"` : ''}
              class="connector__line connector__line--layer"
              pathLength="1"
            />
          </g>
        </g>
      </svg>
    `;

    const template = document.createElement('template');
    template.innerHTML = htmlString;
    const element = template.content.cloneNode(true);
    shadow.append(element);
    
    this.gBody = shadow.querySelector('.connector__g-body') as SVGGElement;
    this.lineLayer = this.gBody.querySelector('.connector__line--layer') as SVGLineElement;
    this.lineMask = this.gBody.querySelector('.connector__line--mask') as SVGLineElement;
  }

  updateEndpoints = () => {
    if (!this.startPoint || !this.endPoint) { return; }

    // to properly place the endpoints, we need the positions of their bounding boxes
    // get the bounding rectangles for starting reference element, ending reference element, and parent element
    // TODO: Use offsetParent to account for direct parent beieng statically positioned
    const svgParentElement = this.parentElement!;
    
    // the class is appended without classList.add() so that multiple applications
    // of the class do not interfere with each other upon removal
    // CHANGE NOTE: elements are unhidden using override to allow access to bounding box
    this.startPoint[0].classList.value += ` wbfk-override-hidden`;
    this.endPoint[0].classList.value += ` wbfk-override-hidden`;
    const {left: startLeft, right: startRight, top: startTop, bottom: startBottom} = this.startPoint[0].getBoundingClientRect();
    const {left: endLeft, right: endRight, top: endTop, bottom: endBottom} = this.endPoint[0].getBoundingClientRect();
    const {left: parentLeft, top: parentTop} = svgParentElement.getBoundingClientRect();
    this.startPoint[0].classList.value = this.startPoint[0].classList.value.replace(` wbfk-override-hidden`, '');
    this.endPoint[0].classList.value = this.endPoint[0].classList.value.replace(` wbfk-override-hidden`, '');

    // The x and y coordinates of the line need to be with respect to the top left of document
    // Thus, we must subtract the parent element's current top and left from the offset
    // But because elements start in their parent's Content box (which excludes the border) instead of the Fill area,...
    // ...(which includes the border), our element's top and left are offset by the parent element's border width with...
    // ...respect to the actual bounding box of the parent. Therefore, we must subtract the parent's border thicknesses as well.
    const connectorLeftOffset = -parentLeft - Number.parseFloat(getComputedStyle(svgParentElement).borderLeftWidth);
    const connectorTopOffset = -parentTop - Number.parseFloat(getComputedStyle(svgParentElement).borderTopWidth);

    // change x and y coords of our <svg>'s nested <line> based on the bounding boxes of the start and end reference elements
    // the offset with respect to the reference elements' tops and lefts is calculated using linear interpolation
    this.x1 = (1 - this.startPoint[1]) * startLeft + (this.startPoint[1]) * startRight + connectorLeftOffset;
    this.y1 = (1 - this.startPoint[2]) * startTop + (this.startPoint[2]) * startBottom + connectorTopOffset;
    this.x2 = (1 - this.endPoint[1]) * endLeft + (this.endPoint[1]) * endRight + connectorLeftOffset;
    this.y2 = (1 - this.endPoint[2]) * endTop + (this.endPoint[2]) * endBottom + connectorTopOffset;
  }

  setTrackingInterval = () => {
    this.trackingTimeout = setInterval(this.updateEndpoints, 4);
  }

  clearTrackingInterval = () => {
    clearInterval(this.trackingTimeout);
  }
}

customElements.define('wbfk-connector', Connector);

export class SetConnectorBlock extends AnimBlock {
  previousStartPoint?: [startElem: Element, leftOffset: number, topOffset: number];
  previousEndPoint?: [endElem: Element, leftOffset: number, topOffset: number];

  connectorConfig: ConnectorConfig = {} as ConnectorConfig;
  previousConnectorConfig: ConnectorConfig = {} as ConnectorConfig;

  protected get defaultConfig(): Partial<AnimBlockConfig> {
    return {
      duration: 0,
      commitStyles: false,
    };
  }
  
  constructor(
    public connectorElem: Connector,
    public startPoint: [startElem: Element, leftOffset: number, topOffset: number],
    public endPoint: [endElem: Element, leftOffset: number, topOffset: number],
    connectorConfig: Partial<ConnectorConfig> = {},
    /*animName: string, behaviorGroup: TBehavior*/
    ) {
    // if (!behaviorGroup) { throw new Error(`Invalid set line animation name ${animName}`); }

    if (!(startPoint?.[0] instanceof Element)) {
      throw new Error(`Start point element must not be undefined`); // TODO: Improve error message
    }
    if (!(endPoint?.[0] instanceof Element)) {
      throw new Error(`End point element must not be undefined`); // TODO: Improve error message
    }

    // TODO: Validate offsets?

    super(connectorElem, `~set-line-points`, {
      generateKeyframes() {
        return [[], []];
      },
    });

    this.connectorConfig = this.applyLineConfig(connectorConfig);
  }

  protected _onStartForward(): void {
    this.previousStartPoint = this.connectorElem.startPoint;
    this.previousEndPoint = this.connectorElem.endPoint;
    this.previousConnectorConfig.trackEndpoints = this.connectorElem.tracking;
    this.connectorElem.startPoint = this.startPoint;
    this.connectorElem.endPoint = this.endPoint;
    this.connectorElem.tracking = this.connectorConfig.trackEndpoints;
  }

  protected _onStartBackward(): void {
    this.connectorElem.startPoint = this.previousStartPoint;
    this.connectorElem.endPoint = this.previousEndPoint;
    this.connectorElem.tracking = this.previousConnectorConfig.trackEndpoints;
  }

  applyLineConfig(connectorConfig: Partial<ConnectorConfig>): ConnectorConfig {
    return {
      trackEndpoints: this.connectorElem.tracking,
      ...connectorConfig,
    };
  }
}

export class DrawConnectorBlock<TBehavior extends KeyframeBehaviorGroup = KeyframeBehaviorGroup> extends AnimBlock<TBehavior> {
  protected get defaultConfig(): Partial<AnimBlockConfig> {
    return {};
  }

  constructor(public connectorElem: Connector, public animName: string, behaviorGroup: TBehavior) {
    if (!behaviorGroup) { throw new Error(`Invalid line-drawing animation name ${animName}`); }
    super(connectorElem, animName, behaviorGroup);
  }

  protected _onStartForward(): void {
    this.connectorElem.updateEndpoints();
    this.domElem.classList.remove('wbfk-hidden');
    if (this.connectorElem.tracking) {
      this.connectorElem.setTrackingInterval();
    }
  }

  protected _onFinishBackward(): void {
    this.domElem.classList.add('wbfk-hidden');
    this.connectorElem.clearTrackingInterval();
  }
}

export class EraseConnectorBlock<TBehavior extends KeyframeBehaviorGroup = KeyframeBehaviorGroup> extends AnimBlock<TBehavior> {
  protected get defaultConfig(): Partial<AnimBlockConfig> {
    return {};
  }

  constructor(public connectorElem: Connector, public animName: string, behaviorGroup: TBehavior) {
    if (!behaviorGroup) { throw new Error(`Invalid line-erasing animation name ${animName}`); }
    super(connectorElem, animName, behaviorGroup);
  }

  protected _onStartForward(): void {
    this.connectorElem.clearTrackingInterval();
  }

  protected _onStartBackward(): void {
    this.connectorElem.updateEndpoints();
    if (this.connectorElem.tracking) {
      this.connectorElem.setTrackingInterval();
    }
  }
}
