import {
  ArrayLike,
  BlendMode,
  ClippingAttachment,
  Color,
  MeshAttachment,
  NumberArrayLike,
  RegionAttachment,
  Skeleton,
  SkeletonClipping
} from "@esotericsoftware/spine-core";
import { BoundingBox, Engine, Material, SubPrimitive, Texture2D } from "@galacean/engine";
import { SpineAnimationRenderer } from "./SpineAnimationRenderer";
import { SpineTexture } from "../loader/SpineTexture";
import { setBlendMode } from "../util/BlendMode";
import { ClearablePool } from "../util/ClearablePool";
import { ReturnablePool } from "../util/ReturnablePool";

class SubRenderItem {
  subPrimitive: SubPrimitive;
  blendMode: BlendMode;
  texture: any;
  slotName?: string;
}

/**
 * @internal
 */
export class SpineGenerator {
  static VERTEX_SIZE = 8;
  static VERTEX_STRIDE = 9;
  static tempDark = new Color();
  static tempColor = new Color();
  static tempVerts = new Array(8);
  static QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];
  static subPrimitivePool = new ReturnablePool(SubPrimitive);
  static subRenderItemPool = new ClearablePool(SubRenderItem);

  private _separateSlots = new Map();
  private _subRenderItems: SubRenderItem[] = [];
  private _clipper: SkeletonClipping = new SkeletonClipping();
  private _separateSlotTextureMap: Map<string, Texture2D> = new Map();

  buildPrimitive(skeleton: Skeleton, renderer: SpineAnimationRenderer) {
    const { _indices, _vertices, _localBounds, _vertexCount, _subPrimitives, engine, zSpacing, premultipliedAlpha } =
      renderer;

    _localBounds.min.set(Infinity, Infinity, Infinity);
    _localBounds.max.set(-Infinity, -Infinity, -Infinity);

    const { _clipper, _separateSlots, _subRenderItems, _separateSlotTextureMap } = this;

    const { tempVerts, subRenderItemPool, subPrimitivePool, VERTEX_SIZE } = SpineGenerator;

    _subRenderItems.length = 0;
    subRenderItemPool.clear();

    let triangles: Array<number>;
    let uvs: NumberArrayLike;

    let verticesLength = 0;
    let indicesLength = 0;
    let start = 0;
    let count = 0;

    let blend = BlendMode.Normal;
    let texture: SpineTexture = null;
    let tempBlendMode: BlendMode | null = null;
    let tempTexture: SpineTexture | null = null;

    let primitiveIndex = 0;

    const drawOrder = skeleton.drawOrder;
    for (let slotIndex = 0, n = drawOrder.length; slotIndex < n; ++slotIndex) {
      const slot = drawOrder[slotIndex];
      if (!slot.bone.active) {
        _clipper.clipEndWithSlot(slot);
        continue;
      }

      const attachment = slot.getAttachment();
      if (!attachment) {
        _clipper.clipEndWithSlot(slot);
        continue;
      }

      const z = zSpacing * slotIndex;
      const isClipping = _clipper.isClipping();
      let numFloats = 0;
      let attachmentColor: Color = null;
      let vertexSize = isClipping ? 2 : VERTEX_SIZE;

      switch (attachment.constructor) {
        case RegionAttachment:
          const regionAttachment = <RegionAttachment>attachment;
          attachmentColor = regionAttachment.color;
          numFloats = vertexSize * 4;
          regionAttachment.computeWorldVertices(slot, tempVerts, 0, vertexSize);
          triangles = SpineGenerator.QUAD_TRIANGLES;
          uvs = regionAttachment.uvs;
          texture = regionAttachment.region.texture;
          break;
        case MeshAttachment:
          const meshAttachment = <MeshAttachment>attachment;
          attachmentColor = meshAttachment.color;
          numFloats = (meshAttachment.worldVerticesLength >> 1) * vertexSize;
          if (numFloats > _vertices.length) {
            SpineGenerator.tempVerts = new Array(numFloats);
          }
          meshAttachment.computeWorldVertices(slot, 0, meshAttachment.worldVerticesLength, tempVerts, 0, vertexSize);
          triangles = meshAttachment.triangles;
          uvs = meshAttachment.uvs;
          texture = meshAttachment.region.texture;
          break;
        case ClippingAttachment:
          let clip = <ClippingAttachment>attachment;
          _clipper.clipStart(slot, clip);
          continue;
        default:
          _clipper.clipEndWithSlot(slot);
          continue;
      }

      if (texture != null) {
        let finalVertices: ArrayLike<number>;
        let finalVerticesLength: number;
        let finalIndices: ArrayLike<number>;
        let finalIndicesLength: number;

        const skeleton = slot.bone.skeleton;
        const skeletonColor = skeleton.color;
        const slotColor = slot.color;
        const finalColor = SpineGenerator.tempColor;
        const finalAlpha = skeletonColor.a * slotColor.a * attachmentColor.a;

        finalColor.r = skeletonColor.r * slotColor.r * attachmentColor.r;
        finalColor.g = skeletonColor.g * slotColor.g * attachmentColor.g;
        finalColor.b = skeletonColor.b * slotColor.b * attachmentColor.b;
        finalColor.a = finalAlpha;

        if (premultipliedAlpha) {
          finalColor.r *= finalAlpha;
          finalColor.g *= finalAlpha;
          finalColor.b *= finalAlpha;
        }

        if (isClipping) {
          _clipper.clipTriangles(
            tempVerts,
            triangles,
            triangles.length,
            uvs,
            finalColor,
            SpineGenerator.tempDark,
            false
          );
          finalVertices = _clipper.clippedVertices;
          finalVerticesLength = finalVertices.length;
          finalIndices = _clipper.clippedTriangles;
          finalIndicesLength = finalIndices.length;
        } else {
          const { r, g, b, a } = finalColor;
          for (let v = 2, u = 0, n = numFloats; v < n; v += vertexSize, u += 2) {
            tempVerts[v] = r;
            tempVerts[v + 1] = g;
            tempVerts[v + 2] = b;
            tempVerts[v + 3] = a;
            tempVerts[v + 4] = uvs[u];
            tempVerts[v + 5] = uvs[u + 1];
          }
          finalVertices = tempVerts;
          finalVerticesLength = numFloats;
          finalIndices = triangles;
          finalIndicesLength = triangles.length;
        }

        if (finalVerticesLength == 0 || finalIndicesLength == 0) {
          _clipper.clipEndWithSlot(slot);
          continue;
        }

        let indexStart = verticesLength / SpineGenerator.VERTEX_STRIDE;
        let i = verticesLength;
        let j = 0;
        for (; j < finalVerticesLength; ) {
          let x = finalVertices[j++];
          let y = finalVertices[j++];
          _vertices[i++] = x;
          _vertices[i++] = y;
          _vertices[i++] = z;
          _vertices[i++] = finalVertices[j++];
          _vertices[i++] = finalVertices[j++];
          _vertices[i++] = finalVertices[j++];
          _vertices[i++] = finalVertices[j++];
          _vertices[i++] = finalVertices[j++];
          _vertices[i++] = finalVertices[j++];
          this._expandBounds(x, y, z, _localBounds);
        }
        verticesLength = i;

        for (i = indicesLength, j = 0; j < finalIndicesLength; i++, j++) {
          _indices[i] = finalIndices[j] + indexStart;
        }
        indicesLength += finalIndicesLength;

        const slotData = slot.data;
        const slotName = slotData.name;
        const textureChanged = tempTexture !== null && tempTexture !== texture;
        const slotNeedSeparate = _separateSlots.get(slotName);
        blend = slotData.blendMode;
        const blendModeChanged = tempBlendMode !== null && tempBlendMode !== blend;

        if (slotNeedSeparate || blendModeChanged || textureChanged) {
          // Finish accumulated count first
          if (count > 0) {
            primitiveIndex = this._createRenderItem(
              _subPrimitives,
              primitiveIndex,
              start,
              count,
              tempTexture,
              tempBlendMode
            );
            start += count;
            count = 0;
          }
          if (slotNeedSeparate) {
            // If separatedTexture exist, set texture params
            const separateTexture = _separateSlotTextureMap.get(slotName);
            if (separateTexture) {
              const oldTexture = texture.getImage();
              separateTexture.filterMode = oldTexture.filterMode;
              separateTexture.wrapModeU = oldTexture.wrapModeU;
              separateTexture.wrapModeV = oldTexture.wrapModeV;
            }
            primitiveIndex = this._createRenderItem(
              _subPrimitives,
              primitiveIndex,
              start,
              finalIndicesLength,
              texture,
              blend,
              slotName
            );
            start += finalIndicesLength;
            count = 0;
          } else {
            count += finalIndicesLength;
          }
        } else {
          count += finalIndicesLength;
        }
        tempTexture = texture;
        tempBlendMode = blend;
      }

      _clipper.clipEndWithSlot(slot);
    } // slot traverse end

    // add reset sub primitive
    if (count > 0) {
      primitiveIndex = this._createRenderItem(_subPrimitives, primitiveIndex, start, count, texture, blend);
      count = 0;
    }

    _clipper.clipEnd();

    const lastLen = _subPrimitives.length;
    const curLen = _subRenderItems.length;
    for (let i = curLen; i < lastLen; i++) {
      const item = _subPrimitives[i];
      subPrimitivePool.return(item);
    }

    renderer._clearSubPrimitives();
    const materialCache = SpineAnimationRenderer._materialCache;
    for (let i = 0, l = curLen; i < l; ++i) {
      const item = _subRenderItems[i];
      const { slotName, blendMode, texture } = item;
      renderer._addSubPrimitive(item.subPrimitive);
      const subTexture = _separateSlotTextureMap.get(slotName) || texture.getImage();
      const key = `${subTexture.instanceId}_${blendMode}_${premultipliedAlpha}`;
      let material = materialCache.get(key);
      if (!material) {
        material = this._createMaterialForTexture(subTexture, engine, blendMode, premultipliedAlpha);
        materialCache.set(key, material);
      }
      renderer.setMaterial(i, material);
    }

    if (indicesLength > _vertexCount) {
      renderer._createAndBindBuffer(indicesLength);
      this.buildPrimitive(skeleton, renderer);
      return;
    }

    renderer._vertexBuffer.setData(_vertices);
    renderer._indexBuffer.setData(_indices);
  }

  addSeparateSlot(slotName: string) {
    this._separateSlots.set(slotName, slotName);
  }

  addSeparateSlotTexture(slotName: string, texture: Texture2D) {
    this._separateSlotTextureMap.set(slotName, texture);
  }

  private _createMaterialForTexture(
    texture: Texture2D,
    engine: Engine,
    blendMode: BlendMode,
    premultipliedAlpha: boolean
  ): Material {
    const material = SpineAnimationRenderer._getDefaultMaterial(engine);
    material.shaderData.setTexture("material_SpineTexture", texture);
    setBlendMode(material, blendMode, premultipliedAlpha);
    return material;
  }

  private _createRenderItem(
    subPrimitives: SubPrimitive[],
    primitiveIndex: number,
    start: number,
    count: number,
    texture: SpineTexture,
    blend: BlendMode,
    slotName?: string
  ): number {
    const { subPrimitivePool, subRenderItemPool } = SpineGenerator;
    const origin = subPrimitives[primitiveIndex];

    if (origin) {
      primitiveIndex++;
    }

    const subPrimitive = origin || subPrimitivePool.get();
    subPrimitive.start = start;
    subPrimitive.count = count;

    const renderItem = subRenderItemPool.get();
    renderItem.blendMode = blend;
    renderItem.subPrimitive = subPrimitive;
    renderItem.texture = texture;
    renderItem.slotName = slotName;

    this._subRenderItems.push(renderItem);

    return primitiveIndex;
  }

  private _expandBounds(x: number, y: number, z: number, localBounds: BoundingBox) {
    const { min, max } = localBounds;
    min.set(Math.min(min.x, x), Math.min(min.y, y), Math.min(min.z, z));
    max.set(Math.max(max.x, x), Math.max(max.y, y), Math.max(max.z, z));
  }
}
