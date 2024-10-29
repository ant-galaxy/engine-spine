import { AnimationState, AnimationStateData, MeshAttachment, RegionAttachment, Skeleton, SkeletonData } from "@esotericsoftware/spine-core";
import { Engine, Entity, ReferResource, Texture2D } from "@galacean/engine";
import { SpineAnimationRenderer } from "../SpineAnimationRenderer";

/**
 * Represents a resource that manages Spine animation data, textures, and entity templates for the Galacean engine.
 * 
*/
export class SpineResource extends ReferResource {
  /**
   * The url of skeletonData.
   */
  readonly url: string;

  private _texturesInSpineAtlas: Texture2D[] = [];
  private _skeletonData: SkeletonData;
  private _animationStateData: AnimationStateData;

  private _template: Entity;

  constructor(engine: Engine, skeletonData: SkeletonData, url?: string) {
    super(engine);
    this.url = url;
    this._skeletonData = skeletonData;
    this._animationStateData = new AnimationStateData(skeletonData);
    this._associationTextureInSkeletonData(skeletonData);
    this._createTemplate();
  }

  /**
   * The skeleton data associated with this Spine resource.
   */
  get skeletonData(): SkeletonData {
    return this._skeletonData;
  }

  /**
   * The animation state data associated with this Spine resource.
   */
  get animationStateData(): AnimationStateData {
    return this._animationStateData;
  }

  /**
   * Creates and returns a new instance of the spine entity template.
   * 
   * @returns A instance of the spine entity template
   */
  instantiate(): Entity {
    return this._template.clone();
  }

  protected override _onDestroy(): void {
    super._onDestroy();
    this._disassociationSuperResource();
    this._skeletonData = null;
    this._animationStateData = null;
  }

  private _createTemplate(): void {
    const name = this._extractFileName(this.url);
    console.log(name);
    const spineEntity = new Entity(this.engine, name);
    const spineAnimationRenderer = spineEntity.addComponent(SpineAnimationRenderer);
    const skeleton = new Skeleton(this._skeletonData);
    const state = new AnimationState(this._animationStateData);
    spineAnimationRenderer.skeleton = skeleton;
    spineAnimationRenderer.state = state;
    // @ts-ignore
    spineEntity._markAsTemplate(this);
    this._template = spineEntity;
  }

  private _associationTextureInSkeletonData(skeletonData: SkeletonData): void {
    const { skins, slots } = skeletonData;
    const textures = this._texturesInSpineAtlas;

    for (let i = 0, n = skins.length; i < n; i++) {
      for (let j = 0, m = slots.length; j < m; j++) {
        const slot = slots[j];
        const attachment = skins[i].getAttachment(slot.index, slot.name);
        const texture = <Texture2D>(<RegionAttachment | MeshAttachment>attachment)?.region?.texture.texture;
        if (texture) {
          if (!textures.includes(texture)) {
            textures.push(texture);
            // @ts-ignore
            texture._associationSuperResource(this);
          }
        }
      }
    }
  }

  private _disassociationSuperResource(): void {
    const textures = this._texturesInSpineAtlas;
    for (let i = 0, n = textures.length; i < n; i++) {
      // @ts-ignore
      textures[i]._disassociationSuperResource(this);
    }
  }

  private _extractFileName(url: string): string {
    if (!url) return "new_spine_entity";
    const match = url.match(/\/([^\/]+?)(\.[^\/]*)?$/);
    return match ? match[1] : "new_spine_entity";
  }
}
