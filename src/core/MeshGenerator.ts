import {
  Engine,
  Entity,
  MeshRenderer,
  SubMesh,
} from 'oasis-engine';
import { Skeleton } from '../spine-core/Skeleton';
import { SkeletonData } from '../spine-core/SkeletonData';
import { RegionAttachment } from '../spine-core/attachments/RegionAttachment';
import { MeshAttachment } from '../spine-core/attachments/MeshAttachment';
import { ClippingAttachment } from '../spine-core/attachments/ClippingAttachment';
import { Utils, ArrayLike, Color } from '../spine-core/Utils';
import { SkeletonClipping } from '../spine-core/SkeletonClipping';
import { SpineMesh } from './SpineMesh';
import { SpineRenderSetting } from '../types';


export class MeshGenerator {
  static QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];
  static VERTEX_SIZE = 2 + 2 + 4;
  static VERTEX_STRIDE = 9;

  private setting: SpineRenderSetting;
  private engine: Engine;
  private entity: Entity;
  private clipper: SkeletonClipping = new SkeletonClipping();
  private spineMesh: SpineMesh = new SpineMesh();

  private vertices = new Float32Array(1024);
  private verticesWithZ = new Float32Array(1024);
  private indices = new Uint16Array(1024);
  private tempColor = new Color();
  readonly separateSlots: string[] = [];

  get mesh() {
    return this.spineMesh.mesh;
  }

  constructor(engine: Engine, entity: Entity) {
    this.engine = engine;
    this.entity = entity;
  }

  initialize(skeleton?: Skeleton) {
    const meshRenderer = this.entity.getComponent(MeshRenderer);
    if (!meshRenderer) {
      console.warn('You need add MeshRenderer component to entity first');
      return;
    }
    const vertexCount = this.getVertexCount(skeleton);
    this.spineMesh.initialize(this.engine, vertexCount);
    meshRenderer.mesh = this.spineMesh.mesh;
  }

  buildMesh(skeleton: Skeleton, setting?: SpineRenderSetting) {
    if (!skeleton) {
      return;
    }

    if (setting) {
      this.setting = setting;
    }

    const meshRenderer = this.entity.getComponent(MeshRenderer);
    if (!meshRenderer) {
      console.warn('You need add MeshRenderer component to entity first');
      return;
    }

    const {
      useClipping = true,
      zSpacing = 0.01,
    } = this.setting || {};

    let verticesLength = 0;
    let indicesLength = 0;

    const drawOrder = skeleton.drawOrder;
    const clipper = this.clipper;
    const seperateSubMesh = [];
    const restSubMesh = [];
    let vertices: ArrayLike<number> = this.vertices;
    let triangles: Array<number> = null;
    let uvs: ArrayLike<number> = null;
    let start = 0;
    let count = 0;
    for (let slotIndex = 0; slotIndex < drawOrder.length; slotIndex += 1) {
      const slot = drawOrder[slotIndex];

      if (!slot.bone.active) {
        clipper.clipEndWithSlot(slot);
        continue;
      }
      const attachment = slot.getAttachment();
      let attachmentColor: Color = null;
      let texture = null;
      const z = zSpacing * slotIndex;
      let numFloats = 0;
      let vertexSize = clipper.isClipping() ? 2 : MeshGenerator.VERTEX_SIZE;
      
      if (
        attachment instanceof RegionAttachment
      ) {
        let region = <RegionAttachment>attachment;
        attachmentColor = region.color;
        vertices = this.vertices;
        numFloats = vertexSize * 4;
        region.computeWorldVertices(slot.bone, vertices, 0, vertexSize);
        triangles = MeshGenerator.QUAD_TRIANGLES;
        uvs = region.uvs;
        texture = region.region.renderObject.texture;
      } else if (
        attachment instanceof MeshAttachment
      ) {
        let mesh = <MeshAttachment>attachment;
        attachmentColor = mesh.color;
        vertices = this.vertices;
        numFloats = (mesh.worldVerticesLength >> 1) * vertexSize;
        if (numFloats > vertices.length) {
          // vertices = this.vertices = Utils.newFloatArray(numFloats);
        }
        mesh.computeWorldVertices(slot, 0, mesh.worldVerticesLength, vertices, 0, vertexSize);
        triangles = mesh.triangles;
        uvs = mesh.uvs;
        texture = mesh.region.renderObject.texture;
      }  else if (
        attachment instanceof ClippingAttachment
      ) {
        if (useClipping) {
          let clip = <ClippingAttachment>(attachment);
          clipper.clipStart(slot, clip);
          continue;
        }
      } else continue;

      if (texture != null) {
        let skeleton = slot.bone.skeleton;
        let skeletonColor = skeleton.color;
        let slotColor = slot.color;
        let alpha = skeletonColor.a * slotColor.a * attachmentColor.a;
        let color = this.tempColor;
        color.set(skeletonColor.r * slotColor.r * attachmentColor.r,
            skeletonColor.g * slotColor.g * attachmentColor.g,
            skeletonColor.b * slotColor.b * attachmentColor.b,
            alpha);

        let finalVertices: ArrayLike<number>;
        let finalVerticesLength: number;
        let finalIndices: ArrayLike<number>;
        let finalIndicesLength: number;

        if (clipper.isClipping()) {
          clipper.clipTriangles(vertices, numFloats, triangles, triangles.length, uvs, color, null, false);
          let clippedVertices = clipper.clippedVertices;
          let clippedTriangles = clipper.clippedTriangles;
          finalVertices = clippedVertices;
          finalVerticesLength = clippedVertices.length;
          finalIndices = clippedTriangles;
          finalIndicesLength = clippedTriangles.length;
        } else {
          let verts = vertices;
          for (let v = 2, u = 0, n = numFloats; v < n; v += vertexSize, u += 2) {
            verts[v] = color.r;
            verts[v + 1] = color.g;
            verts[v + 2] = color.b;
            verts[v + 3] = color.a;
            verts[v + 4] = uvs[u];
            verts[v + 5] = uvs[u + 1];
          }
          finalVertices = vertices;
          finalVerticesLength = numFloats;
          finalIndices = triangles;
          finalIndicesLength = triangles.length;
        }

        if (finalVerticesLength == 0 || finalIndicesLength == 0) {
          continue;
        }
        
        let indexStart = verticesLength / MeshGenerator.VERTEX_STRIDE;
        let verticesWithZ = this.verticesWithZ;
        let i = verticesLength;
        let j = 0;
        for (; j < finalVerticesLength; ) {
          verticesWithZ[i++] = finalVertices[j++];
          verticesWithZ[i++] = finalVertices[j++];
          verticesWithZ[i++] = z;
          verticesWithZ[i++] = finalVertices[j++];
          verticesWithZ[i++] = finalVertices[j++];
          verticesWithZ[i++] = finalVertices[j++];
          verticesWithZ[i++] = finalVertices[j++];
          verticesWithZ[i++] = finalVertices[j++];
          verticesWithZ[i++] = finalVertices[j++];
        }
        verticesLength = i;

        let indicesArray = this.indices;
        for (i = indicesLength, j = 0; j < finalIndicesLength; i++, j++) {
          indicesArray[i] = finalIndices[j] + indexStart;
        }

        // add submesh
        const slotName = slot.data.name;
        const needSeparate = this.separateSlots.includes(slotName);

        if (needSeparate) {
          const subMesh = new SubMesh(indicesLength, finalIndicesLength);
          seperateSubMesh.push(subMesh);
          if (count > 0) {
            const prevSubMesh = new SubMesh(start, count);
            restSubMesh.push(prevSubMesh);
            count = 0;
          }
          start = indicesLength + finalIndicesLength;
        } else {
          count += finalIndicesLength;
        }
        
        indicesLength += finalIndicesLength;

        const materials = meshRenderer.getMaterials();
        for (let i = 0; i < materials.length; i += 1) {
          const mtl = materials[i];
          if (!mtl.shaderData.getTexture('map')) {
            mtl.shaderData.setTexture('map', texture.texture);
          }
        }
      }

      clipper.clipEndWithSlot(slot);

    } // slot traverse end

    clipper.clipEnd();

    // add reset sub mesh
    if (count > 0) {
      const subMesh = new SubMesh(start, count);
      restSubMesh.push(subMesh);
      count = 0;
    }

    // update subMesh
    this.spineMesh.mesh.clearSubMesh();
    const subMeshes = seperateSubMesh.concat(restSubMesh);
    for (let i = 0; i < subMeshes.length; i += 1) {
      this.spineMesh.mesh.addSubMesh(subMeshes[i]);
    }
  }

  fillVertexData() {
    this.spineMesh.fillVertexData(this.verticesWithZ);
  }

  fillIndexData() {
    this.spineMesh.fillIndexData(this.indices);
  }

  addSeparateSlot(slotName: string) {
    this.separateSlots.push(slotName);
  }

  getVertexCount(skeleton: Skeleton) {
    if (!skeleton) return;
    const drawOrder = skeleton.drawOrder;
    let vertexCount = 0;
    for (let i = 0, n = drawOrder.length; i < n; i++) {
      let slot = drawOrder[i];
      if (!slot.bone.active) continue;
      let attachment = slot.getAttachment();
      if (!attachment) {
        continue;
      } else if (attachment instanceof RegionAttachment) {
        vertexCount += MeshGenerator.QUAD_TRIANGLES.length;
      } else if (attachment instanceof MeshAttachment) {
        let mesh = attachment;
        vertexCount += mesh.triangles.length;
      } else continue;
    }
    vertexCount *= 3;
    this.vertices = new Float32Array(vertexCount * MeshGenerator.VERTEX_SIZE);
    this.verticesWithZ = new Float32Array(vertexCount * MeshGenerator.VERTEX_STRIDE);
    this.indices = new Uint16Array(vertexCount);
    this.vertexCount = vertexCount;
    return vertexCount;
  }
}