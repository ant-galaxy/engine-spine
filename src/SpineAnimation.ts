import { Skeleton, SkeletonData, AnimationState, Physics, TrackEntry, AnimationStateData } from "@esotericsoftware/spine-core";
import { SpineGenerator } from "./SpineGenerator";
import {
  Buffer,
  Renderer,
  Entity,
  ignoreClone,
  Material,
  Engine,
  BoundingBox,
  Primitive,
  SubPrimitive,
  deepClone,
  VertexElement,
  VertexElementFormat,
  BufferBindFlag,
  BufferUsage,
  VertexBufferBinding,
  IndexBufferBinding,
  IndexFormat,
} from "@galacean/engine";
import { SpineMaterial } from "./SpineMaterial";
import { SkeletonDataResource } from "./loader/SkeletonDataResource";
import { getBlendMode } from "./util/BlendMode";

declare module '@esotericsoftware/spine-core' {
  interface SkeletonData {
    refCount: number;
  }
}

interface InitialState {
  animationName: string;
  skinName: string;
  loop: boolean;
  scale: number;
}

export type SpineRenderSetting = {
  useClipping: boolean;
  zSpacing: number;
}

export class SpineAnimation extends Renderer {
  private static _defaultMaterial: Material;
  private static _spineGenerator = new SpineGenerator();

  private static positionVertexElement = new VertexElement('POSITION', 0, VertexElementFormat.Vector3, 0);
  private static colorVertexElement = new VertexElement('COLOR_0', 12, VertexElementFormat.Vector4, 0);
  private static uvVertexElement = new VertexElement('TEXCOORD_0', 28, VertexElementFormat.Vector2, 0);

  static materialCache = new Map<string, Material>();
  static animationDataCache = new Map<SkeletonData, AnimationStateData>();

  static getDefaultMaterial(engine: Engine): Material {
    let defaultMaterial = this._defaultMaterial;
    if (defaultMaterial) {
      if (defaultMaterial.engine === engine) {
        return defaultMaterial.clone();
      } else {
        defaultMaterial.destroy(true);
        defaultMaterial = null;
      }
    }
    defaultMaterial = new SpineMaterial(engine);
    defaultMaterial.isGCIgnored = true;
    this._defaultMaterial = defaultMaterial;
    return defaultMaterial.clone();
  }

  /** Render setting for spine rendering. */
  @deepClone
  setting: SpineRenderSetting = {
    zSpacing: 0.01,
    useClipping: true,
  };
  /** Initial spine animation and skin state. */
  @deepClone
  initialState: InitialState = {
    scale: 1,
    loop: false,
    animationName: null,
    skinName: 'default',
  };
  /** @internal */
  @ignoreClone
  _primitive: Primitive;
  /** @internal */
  @ignoreClone
  _subPrimitives: SubPrimitive[] = [];
  /** @internal */
  @ignoreClone
  _indexBuffer: Buffer;
  /** @internal */
  @ignoreClone
  _vertexBuffer: Buffer;
  /** @internal */
  @ignoreClone
  _vertices: Float32Array;
  /** @internal */
  @ignoreClone
  _indices: Uint16Array;
  /** @internal */
  @ignoreClone
  _needResizeBuffer = false;
  /** @internal */
  @ignoreClone
  _vertexCount = 0;
   /** @internal */
  @ignoreClone
  _resource: SkeletonDataResource;

  @ignoreClone
  private _skeleton: Skeleton;
  @ignoreClone
  private _state: AnimationState;

  /**
   * Setting `skeletonData` initializes a new Spine animation with the provided data.
   * This property allows you to switch between different animations at runtime.
   */
  set resource(value: SkeletonDataResource) {
    if (!value) {
      this._state = null;
      this._skeleton = null;
      this._resource = null;
      return;
    }
    this._resource = value;
    // @ts-ignore
    this._addResourceReferCount(value, 1);
    const { skeletonData } = value;
    this._skeleton = new Skeleton(skeletonData);
    let animationData = SpineAnimation.animationDataCache.get(skeletonData);
    if (!animationData) {
      animationData = new AnimationStateData(skeletonData);
      SpineAnimation.animationDataCache.set(skeletonData, animationData);
    }
    this._state = new AnimationState(animationData);
    const maxCount = SpineAnimation._spineGenerator.getMaxVertexCount(skeletonData);
    this._createBuffer(maxCount);
    this._dirtyUpdateFlag |= SpineAnimationUpdateFlags.AssetVolume;
    this._state.addListener({
      start: () => {
        this.onAnimationStart();
      },
      complete: (entry: TrackEntry) => {
        this.onAnimationComplete(entry);
      },
    })
  }

  /**
   * Provides access to `AnimationState` which controls animation playback on a skeleton. 
   * You can use its API to manage, blend, and transition between multiple simultaneous animations effectively.
   */
  get state() {
    return this._state;
  }

  /**
   * Provides access to `Skeleton`, which defines the structure of a Spine model.
   * Through its API, users can manipulate bone positions, rotations, scaling 
   * and change spine attachment to customize character appearances dynamically during runtime.
   */
  get skeleton() {
    return this._skeleton;
  }

  /**
   * @internal
   */
  get engine() {
    return this._engine;
  }

  constructor(entity: Entity) {
    super(entity);
    const primitive = new Primitive(this._engine);
    this._primitive = primitive;
    primitive.addVertexElement(SpineAnimation.positionVertexElement);
    primitive.addVertexElement(SpineAnimation.colorVertexElement);
    primitive.addVertexElement(SpineAnimation.uvVertexElement);
  }

  /**
   * @internal
   */
  // @ts-ignore
  override _onEnable() {
    const { skeleton, state } = this;
    if (skeleton && state) {
      const { animationName, skinName, loop, scale } = this.initialState;
      skeleton.scaleX = scale;
      skeleton.scaleY = scale;
      if (skinName !== 'default') {
        skeleton.setSkinByName(skinName);
        skeleton.setToSetupPose();
        state.apply(skeleton);
      }
      if (animationName) {
        state.setAnimation(0, animationName, loop);
      }
    }
  }

  /**
   * Separate slot by slot name. This will add a new sub primitive, and new materials.
   */
  addSeparateSlot(slotName: string) {
    if (!this._skeleton) {
      console.error("Skeleton not found!");
    }
    const slot = this._skeleton.findSlot(slotName);
    if (slot) {
      SpineAnimation._spineGenerator.addSeparateSlot(slotName);
    } else {
      console.warn(`Slot: ${slotName} not find.`);
    }
  }

  /**
   * @internal
   */
  override update(delta: number): void {
    const { _state, _skeleton } = this;
    if (_state && _skeleton) {
      _state.update(delta);
      _state.apply(_skeleton);
      _skeleton.update(delta);
      _skeleton.updateWorldTransform(Physics.update);
    }
  }

  /**
   * @internal
   */
  override _updateRendererShaderData(context: any): void {
    if (this._skeleton) {
      SpineAnimation._spineGenerator.buildPrimitive(this._skeleton, this);
    }
    if (this._isContainDirtyFlag(SpineAnimationUpdateFlags.AnimationVolume)) {
      this._calculateGeneratorBounds(this.bounds);
    }
    if (this._isContainDirtyFlag(SpineAnimationUpdateFlags.AssetVolume)) {
      this._calculateGeneratorBounds(this.bounds);
      this._setDirtyFlagFalse(SpineAnimationUpdateFlags.AssetVolume);
    }
  }

  /**
   * @internal
   */
  // @ts-ignore
  override _render(context: any): void {
    const { _primitive, _subPrimitives } = this;
    const { _materials: materials, _engine: engine } = this;
    // @ts-ignore
    const renderElement = engine._renderElementPool.get();
    // @ts-ignore
    renderElement.set(this.priority, this._distanceForSort);
    // @ts-ignore
    const subRenderElementPool = engine._subRenderElementPool;
    if (!_subPrimitives) return;
    for (let i = 0, n = _subPrimitives.length; i < n; i++) {
      let material = materials[i];
      if (!material) {
        continue;
      }
      if (material.destroyed || material.shader.destroyed) {
        // @ts-ignore
        material = this.engine._meshMagentaMaterial;
      }

      const subRenderElement = subRenderElementPool.get();
      subRenderElement.set(this, material, _primitive, _subPrimitives[i]);
      renderElement.addSubRenderElement(subRenderElement);
    }
    // @ts-ignore
    context.camera._renderPipeline.pushRenderElement(context, renderElement);
  }

  /**
   * @internal
   */
  // @ts-ignore
  override _updateBounds(worldBounds: BoundingBox): void {
    if (this._isContainDirtyFlag(SpineAnimationUpdateFlags.TransformVolume)) {
      this._calculateGeneratorBounds(worldBounds);
      this._setDirtyFlagFalse(SpineAnimationUpdateFlags.TransformVolume);
    }
  }

    /**
   * @internal
   */
  _calculateGeneratorBounds(worldBounds: BoundingBox) {
    const { bounds } = SpineGenerator;
    BoundingBox.transform(
      bounds,
      this.entity.transform.worldMatrix,
      worldBounds,
    );
  }
  

  /**
   * @internal
   */
  // @ts-ignore
  override _cloneTo(target: SpineAnimation): void {
    target.resource = this._resource;
  }

  /**
   * @internal
   */
  override _onDestroy(): void {
    const { _primitive, _subPrimitives, _resource } = this;
    _subPrimitives.length = 0;
    if (_primitive) {
      _primitive.destroy();
    }
    if (_resource) {
      this._addResourceReferCount(_resource, -1);
    }
    this._clearMaterialCache();
    this._primitive = null;
    this._resource = null;
    this._skeleton = null;
    this._state = null;
    this.setting = null;
    super._onDestroy();
  }

  /**
   * @internal
   */
  _createBuffer(vertexCount: number) {
    const { _engine, _primitive } = this;
    this._vertices = new Float32Array(vertexCount * SpineGenerator.VERTEX_STRIDE);
    this._indices = new Uint16Array(vertexCount);
    const vertexStride = (SpineGenerator.VERTEX_STRIDE) * 4; // position + color + uv * Float32 byteLen
    const vertexBuffer = new Buffer(
      _engine,
      BufferBindFlag.VertexBuffer,
      this._vertices,
      BufferUsage.Dynamic,
    );
    const indexBuffer = new Buffer(
      _engine,
      BufferBindFlag.IndexBuffer,
      this._indices,
      BufferUsage.Dynamic,
    );
    this._indexBuffer = indexBuffer;
    this._vertexBuffer = vertexBuffer;
    const vertexBufferBinding = new VertexBufferBinding(vertexBuffer, vertexStride);
    this._primitive.setVertexBufferBinding(0, vertexBufferBinding);
    const indexBufferBinding = new IndexBufferBinding(indexBuffer, IndexFormat.UInt16);
    _primitive.setIndexBufferBinding(indexBufferBinding);
  }

  /**
   * @internal
   */
  _addSubPrimitive(subPrimitive: SubPrimitive) {
    this._subPrimitives.push(subPrimitive);
  }

  /**
   * @internal
   */
  _clearSubPrimitives() {
    this._subPrimitives.length = 0;
  }

  /**
   * @internal
   */
  _isContainDirtyFlag(type: number): boolean {
    return (this._dirtyUpdateFlag & type) != 0;
  }

  /**
   * @internal
   */
  _setDirtyFlagFalse(type: number): void {
    this._dirtyUpdateFlag &= ~type;
  }

  /**
   * @internal
   */
  @ignoreClone
  _onAnimationStart(): void {
    this._dirtyUpdateFlag |= SpineAnimationUpdateFlags.AnimationVolume;
  }

  /**
   * @internal
   */
  // @ts-ignore
  override _onTransformChanged(): void {
    this._dirtyUpdateFlag |= SpineAnimationUpdateFlags.TransformVolume | RendererUpdateFlags.WorldVolume;
  }

  private onAnimationStart() {
    this._dirtyUpdateFlag |= SpineAnimationUpdateFlags.AnimationVolume;
  }

  private onAnimationComplete(entry: TrackEntry) {
    if (!entry.loop) {
      this._setDirtyFlagFalse(SpineAnimationUpdateFlags.AnimationVolume)
    }
  }

  private _clearMaterialCache() {
    this._materials.forEach((item) => {
      const texture = item.shaderData.getTexture('material_SpineTexture');
      const blendMode = getBlendMode(item);
      const key = `${texture.instanceId}_${blendMode}`;
      SpineAnimation.materialCache.delete(key);
    });
  }

}


/**
 * @internal
 */
export enum SpineAnimationUpdateFlags {
  /** On World Transform Changed */
  TransformVolume = 0x1,
  /** On Animation start play */
  AnimationVolume = 0x2,
  /** On skeleton data asset changed */
  AssetVolume = 0x4,
}

/**
 * @internal
 */
export enum RendererUpdateFlags {
  /** Include world position and world bounds. */
  WorldVolume = 0x1
}
