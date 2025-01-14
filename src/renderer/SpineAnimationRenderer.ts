import { AnimationState, AnimationStateData, Physics, Skeleton } from "@esotericsoftware/spine-core";
import {
  assignmentClone,
  BoundingBox,
  Buffer,
  BufferBindFlag,
  BufferUsage,
  deepClone,
  Engine,
  Entity,
  ignoreClone,
  IndexBufferBinding,
  IndexFormat,
  Material,
  Primitive,
  Renderer,
  SubPrimitive,
  Vector3,
  VertexBufferBinding,
  VertexElement,
  VertexElementFormat
} from "@galacean/engine";
import { SpineGenerator } from "./SpineGenerator";
import { SpineMaterial } from "./SpineMaterial";
import { SpineResource } from "../loader/SpineResource";
import { getBlendMode } from "../util/BlendMode";

/**
 * Spine animation renderer, capable of rendering spine animations and providing functions for animation and skeleton manipulation.
 */
export class SpineAnimationRenderer extends Renderer {
  private static _defaultMaterial: Material;
  private static _spineGenerator = new SpineGenerator();

  private static _positionVertexElement = new VertexElement("POSITION", 0, VertexElementFormat.Vector3, 0);
  private static _colorVertexElement = new VertexElement("COLOR_0", 12, VertexElementFormat.Vector4, 0);
  private static _uvVertexElement = new VertexElement("TEXCOORD_0", 28, VertexElementFormat.Vector2, 0);

  /** @internal */
  static _materialCache = new Map<string, Material>();

  /** @internal */
  static _getDefaultMaterial(engine: Engine): Material {
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

  /**
   * The spacing between z layers in world units.
   */
  @assignmentClone
  zSpacing = 0.001;

  /**
   * Whether to use premultiplied alpha mode for rendering.
   * When enabled, vertex color values are multiplied by the alpha channel.
   * @remarks
 If this option is enabled, the Spine editor must export textures with "Premultiply Alpha" checked.
   */
  @assignmentClone
  premultipliedAlpha = false;

  /**
   * Default state for spine animation.
   * Contains the default animation name to be played, whether this animation should loop, the default skin name.
   */
  @deepClone
  readonly defaultConfig: SpineAnimationDefaultConfig = new SpineAnimationDefaultConfig();

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
  _vertices = new Float32Array();
  /** @internal */
  @ignoreClone
  _indices = new Uint16Array();
  /** @internal */
  @ignoreClone
  _needResizeBuffer = false;
  /** @internal */
  @ignoreClone
  _vertexCount = 0;
  /** @internal */
  @ignoreClone
  _resource: SpineResource;
  /** @internal */
  @ignoreClone
  _localBounds = new BoundingBox(
    new Vector3(Infinity, Infinity, Infinity),
    new Vector3(-Infinity, -Infinity, -Infinity)
  );

  @ignoreClone
  private _skeleton: Skeleton;
  @ignoreClone
  private _state: AnimationState;

  /**
   * The Spine.AnimationState object of this SpineAnimationRenderer.
   * Manage, blend, and transition between multiple simultaneous animations effectively.
   */
  get state(): AnimationState {
    return this._state;
  }

  /**
   * The Spine.Skeleton object of this SpineAnimationRenderer.
   * Manipulate bone positions, rotations, scaling
   * and change spine attachment to customize character appearances dynamically during runtime.
   */
  get skeleton(): Skeleton {
    return this._skeleton;
  }

  /**
   * @internal
   */
  constructor(entity: Entity) {
    super(entity);
    const primitive = new Primitive(this._engine);
    this._primitive = primitive;
    primitive.addVertexElement(SpineAnimationRenderer._positionVertexElement);
    primitive.addVertexElement(SpineAnimationRenderer._colorVertexElement);
    primitive.addVertexElement(SpineAnimationRenderer._uvVertexElement);
  }

  /**
   * @internal
   */
  // @ts-ignore
  override _onEnable(): void {
    this._applyDefaultConfig();
  }

  /**
   * @internal
   */
  override update(delta: number): void {
    const { _state: state, _skeleton: skeleton } = this;
    if (!state || !skeleton) return;
    state.update(delta);
    state.apply(skeleton);
    skeleton.update(delta);
    skeleton.updateWorldTransform(Physics.update);
    SpineAnimationRenderer._spineGenerator.buildPrimitive(this._skeleton, this);
    this._dirtyUpdateFlag |= RendererUpdateFlags.WorldVolume;
  }

  /**
   * @internal
   */
  // @ts-ignore
  override _render(context: any): void {
    const { _primitive, _subPrimitives, _materials: materials, _engine: engine } = this;
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
    BoundingBox.transform(this._localBounds, this.entity.transform.worldMatrix, worldBounds);
  }

  /**
   * @internal
   */
  _setSkeleton(skeleton: Skeleton) {
    this._skeleton = skeleton;
  }

  /**
   * @internal
   */
  _setState(state: AnimationState) {
    this._state = state;
  }

  /**
   * @internal
   */
  // @ts-ignore
  override _cloneTo(target: SpineAnimationRenderer): void {
    const skeletonData = this._skeleton.data;
    const animationStateData = new AnimationStateData(skeletonData);
    const skeleton = new Skeleton(skeletonData);
    const state = new AnimationState(animationStateData);
    target._setSkeleton(skeleton);
    target._setState(state);
  }

  /**
   * @internal
   */
  override _onDestroy(): void {
    this._clearMaterialCache();
    this._subPrimitives.length = 0;
    this._primitive && this._primitive.destroy();
    this._primitive = null;
    this._resource = null;
    this._skeleton = null;
    this._state = null;
    super._onDestroy();
  }

  /**
   * @internal
   */
  _createAndBindBuffer(vertexCount: number): void {
    const { _engine, _primitive } = this;
    this._vertexCount = vertexCount;
    this._vertices = new Float32Array(vertexCount * SpineGenerator.VERTEX_STRIDE);
    this._indices = new Uint16Array(vertexCount);
    const vertexStride = SpineGenerator.VERTEX_STRIDE * 4;
    const vertexBuffer = new Buffer(_engine, BufferBindFlag.VertexBuffer, this._vertices, BufferUsage.Dynamic);
    const indexBuffer = new Buffer(_engine, BufferBindFlag.IndexBuffer, this._indices, BufferUsage.Dynamic);
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
  _addSubPrimitive(subPrimitive: SubPrimitive): void {
    this._subPrimitives.push(subPrimitive);
  }

  /**
   * @internal
   */
  _clearSubPrimitives(): void {
    this._subPrimitives.length = 0;
  }

  private _clearMaterialCache(): void {
    const materialCache = SpineAnimationRenderer._materialCache;
    const { _materials: materials } = this;
    for (let i = 0, len = materials.length; i < len; i += 1) {
      const material = materials[i];
      const texture = material.shaderData.getTexture("material_SpineTexture");
      const blendMode = getBlendMode(material);
      const key = `${texture.instanceId}_${blendMode}`;
      materialCache.delete(key);
    }
  }

  private _applyDefaultConfig(): void {
    const { skeleton, state } = this;
    if (skeleton && state) {
      const { animationName, skinName, loop } = this.defaultConfig;
      if (skinName !== "default") {
        skeleton.setSkinByName(skinName);
        skeleton.setToSetupPose();
      }
      if (animationName) {
        state.setAnimation(0, animationName, loop);
      }
    }
  }

  /**
   * * @deprecated This property is deprecated and will be removed in future releases.
   * Spine resource of current spine animation.
   */
  get resource(): SpineResource {
    return this._resource;
  }

  /**
   * * @deprecated This property is deprecated and will be removed in future releases.
   * Sets the Spine resource for the current animation. This property allows switching to a different `SpineResource`.
   *
   * @param value - The new `SpineResource` to be used for the current animation
   */
  set resource(value: SpineResource) {
    if (!value) {
      this._state = null;
      this._skeleton = null;
      this._resource = null;
      return;
    }
    this._resource = value;
    const { skeletonData, stateData } = value;
    const skeleton = new Skeleton(skeletonData);
    const state = new AnimationState(stateData);
    this._setSkeleton(skeleton);
    this._setState(state);
    this._applyDefaultConfig();
  }
}

/**
 * @internal
 */
export enum SpineAnimationUpdateFlags {
  /** On Animation change */
  Animation = 0x2
}

/**
 * @internal
 */
export enum RendererUpdateFlags {
  /** Include world position and world bounds. */
  WorldVolume = 0x1
}

/**
 * Default state for spine animation.
 * Contains the default animation name to be played, whether this animation should loop,
 * the default skin name, and the default scale of the skeleton.
 */
export class SpineAnimationDefaultConfig {
  /**
   * Creates an instance of default config
   */
  constructor(
    /**
     * Whether the default animation should loop @defaultValue `true. The default animation should loop`
     */
    public loop: boolean = true,

    /**
     * The name of the default animation @defaultValue `null. Do not play any animation by default`
     */
    public animationName: string | null = null,

    /**
     * The name of the default skin @defaultValue `default`
     */
    public skinName: string = "default"
  ) {}
}
