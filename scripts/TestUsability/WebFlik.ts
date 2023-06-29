import { AnimBlock, EntranceBlock, ExitBlock, EmphasisBlock, AnimBlockConfig, TranslationBlock } from "../AnimBlock.js";
import { DrawConnectorBlock, EraseConnectorBlock, Connector, SetConnectorBlock } from "../AnimBlockLine.js";
import { presetEntrances, presetExits, presetEmphases, presetTranslations, presetConnectorEntrances, presetConnectorExits } from "../Presets.js";

export type KeyframeBehaviorGroup = Readonly<{
  generateKeyframes(...args: any[]): [forward: Keyframe[], backward?: Keyframe[]];
  config?: Partial<AnimBlockConfig>;
}>
export type IKeyframesBank<T extends AnimBlock | void = void> = Readonly<Record<string, KeyframeBehaviorGroup>> & (T extends void ? {} : ThisType<T>);

// export interface Obj {
//   Entrances?: IKeyframesBank<EntranceBlock>
// }

// type ShiftTuple<T extends any[]> =
//   T extends [T[0], ...infer R] ? R : never;

// CHANGE NOTE: AnimNameIn now handles keyof and Extract
// TODO: Handle undo-- prefixes
export type AnimationNameIn<TBank extends IKeyframesBank> = Extract<keyof {
  [key in keyof TBank as TBank[key] extends KeyframeBehaviorGroup ? key : never]: TBank[key];
}, string>;

type BlockInitParams<
TBlock extends AnimBlock<TBank[AnimName]>,
  TBank extends IKeyframesBank = IKeyframesBank<TBlock>,
  AnimName extends AnimationNameIn<TBank> = AnimationNameIn<TBank>,
> = Parameters<TBlock['initialize']>

// type ReadonlyAnimBlock<T extends AnimBlock> = Readonly<Omit<T, 'setID'>>;
// type ConstructorFunction = abstract new (...args: any[]) => any;
// type AnimBlockCreator<T extends ConstructorFunction> = (...args: ConstructorParameters<T>)
//   => ReadonlyAnimBlock<InstanceType<T>>;
// type InitType<T extends AnimBlock> = Parameters<T[string]>
// type AnimBlockCreator<
//   TBank extends IKeyframesBank,
//   AnimName extends AnimationNameIn<TBank>,
//   T extends AnimBlock<TBank[AnimName]>,
// > = (domElem: Element, animName: AnimName, ...params: Parameters< T['initialize'] >) => T

class _WebFlik {
  createBanks
  <
   // default = {} ensures intellisense for a given bank still works
   // without specifying the field (why? not sure)
    UserEntranceBank extends IKeyframesBank = {},
    UserExitBank extends IKeyframesBank = {},
    UserEmphasisBank extends IKeyframesBank = {},
    UserTranslationBank extends IKeyframesBank = {},
    IncludePresets extends boolean = true
  >
  (
    { Entrances, Exits, Emphases, Translations }:
    {
      Entrances?: UserEntranceBank & IKeyframesBank<EntranceBlock>;
      Exits?: UserExitBank & IKeyframesBank<ExitBlock>;
      Emphases?: UserEmphasisBank & IKeyframesBank<EmphasisBlock>;
      Translations?: UserTranslationBank & IKeyframesBank<TranslationBlock>;
    }, // TODO: Add = {} default so user doesn't have to pass in empty object if using only presets
    includePresets: IncludePresets | void = true as IncludePresets
  ) /* TODO: Add coherent return type */ {
    type TogglePresets<TUserBank, TPresetBank> = Readonly<TUserBank & (IncludePresets extends true ? TPresetBank : {})>;

    type CombinedEntranceBank = TogglePresets<UserEntranceBank, typeof presetEntrances>;
    type CombinedExitBank = TogglePresets<UserExitBank, typeof presetExits>;
    type CombinedEmphasisBank = TogglePresets<UserEmphasisBank, typeof presetEmphases>;
    type CombinedTranslationBank = TogglePresets<UserTranslationBank, typeof presetTranslations>;
    type CombinedDrawConnectorBank = typeof presetConnectorEntrances;
    type CombinedEraseConnectorBank = typeof presetConnectorExits;

    const combineBanks = <T, U>(presets: T, userDefined: U) => ({...(includePresets ? presets : {}), ...(userDefined ?? {})});
    
    // Add the keyframes groups to the static banks of the block classes
    const combinedEntranceBank = combineBanks(presetEntrances, Entrances) as CombinedEntranceBank;
    const combinedExitBank = combineBanks(presetExits, Exits) as CombinedExitBank;
    const combinedEmphasisBank = combineBanks(presetEmphases, Emphases) as CombinedEmphasisBank;
    const combinedTranslationBank = combineBanks(presetTranslations, Translations) as CombinedTranslationBank;
    const combinedDrawConnectorBank = combineBanks(presetConnectorEntrances, {}) as CombinedDrawConnectorBank;
    const combinedEraseConnectorBank = combineBanks(presetConnectorExits, {}) as CombinedEraseConnectorBank;

    // return functions that can be used to instantiate AnimBlocks with intellisense for the combined banks
    return {
      Entrance: function(domElem, animName, ...params) {
        return new EntranceBlock(domElem, animName, combinedEntranceBank[animName]).initialize(...params);
      },
      Exit: function(domElem, animName, ...params) {
        return new ExitBlock(domElem, animName, combinedExitBank[animName]).initialize(...params);
      },
      Emphasis: function(domElem, animName, ...params) {
        return new EmphasisBlock(domElem, animName, combinedEmphasisBank[animName]).initialize(...params);
      },
      Translation: function(domElem, animName, ...params) {
        return new TranslationBlock(domElem, animName, combinedTranslationBank[animName]).initialize(...params);
      },// TODO: Add optional lineOptions
      SetConnector: function(connectorElem: Connector, startPoint, endPoint) {
        return new SetConnectorBlock(connectorElem, startPoint, endPoint).initialize([]);
      },
      DrawConnector: function(connectorElem, animName, ...params) {
        return new DrawConnectorBlock(connectorElem, animName, combinedDrawConnectorBank[animName]).initialize(...params);
      },
      EraseConnector: function(connectorElem, animName, ...params) {
        return new EraseConnectorBlock(connectorElem, animName, combinedEraseConnectorBank[animName]).initialize(...params);
      },
    } satisfies {
      Entrance: <AnimName extends AnimationNameIn<CombinedEntranceBank>>(
        domElem: Element | null,
        animName: AnimName,
        ...params: BlockInitParams<EntranceBlock<CombinedEntranceBank[AnimName]>>
      ) => EntranceBlock<CombinedEntranceBank[AnimName]>;

      Exit: <AnimName extends AnimationNameIn<CombinedExitBank>>(
        domElem: Element | null,
        animName: AnimName,
        ...params: BlockInitParams<ExitBlock<CombinedExitBank[AnimName]>>
      ) => ExitBlock<CombinedExitBank[AnimName]>;

      Emphasis: <AnimName extends AnimationNameIn<CombinedEmphasisBank>>(
        domElem: Element | null,
        animName: AnimName,
        ...params: BlockInitParams<EmphasisBlock<CombinedEmphasisBank[AnimName]>>
      ) => EmphasisBlock<CombinedEmphasisBank[AnimName]>;

      Translation: <AnimName extends AnimationNameIn<CombinedTranslationBank>>(
        domElem: Element | null,
        animName: AnimName,
        ...params: BlockInitParams<TranslationBlock<CombinedTranslationBank[AnimName]>>
      ) => TranslationBlock<CombinedTranslationBank[AnimName]>;

      SetConnector: (
        connectorElem: Connector,
        startPoint: [startElem: Element | null, leftOffset: number, topOffset: number],
        endPoint: [endElem: Element | null, leftOffset: number, topOffset: number]
      ) => SetConnectorBlock;

      DrawConnector: <AnimName extends AnimationNameIn<CombinedDrawConnectorBank>>(
        connectorElem: Connector,
        animName: AnimName,
        ...params: BlockInitParams<DrawConnectorBlock<CombinedDrawConnectorBank[AnimName]>>
      ) => DrawConnectorBlock<CombinedDrawConnectorBank[AnimName]>;

      EraseConnector: <AnimName extends AnimationNameIn<CombinedEraseConnectorBank>>(
        connectorElem: Connector,
        animName: AnimName,
        ...params: BlockInitParams<EraseConnectorBlock<CombinedEraseConnectorBank[AnimName]>>
      ) => EraseConnectorBlock<CombinedEraseConnectorBank[AnimName]>;
    }
    // satisfies {
    //   // Entrance: AnimBlockCreator<typeof EntranceBlock<CombinedEntranceBank>>;
    //   Exit: AnimBlockCreator<typeof ExitBlock<CombinedExitBank>>;
    //   Emphasis: AnimBlockCreator<typeof EmphasisBlock<CombinedEmphasisBank>>;
    //   Translate: AnimBlockCreator<typeof TranslateBlock>;
    //   TargetedTranslate: AnimBlockCreator<typeof TargetedTranslateBlock>;
    // //   DrawLine: AnimBlockCreator<typeof DrawLine<CombinedDrawLineBank>>
    // };
  }
}


export const WebFlik = new _WebFlik();
