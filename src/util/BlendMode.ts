import { BlendMode } from "@esotericsoftware/spine-core";
import { BlendFactor, BlendOperation, Material } from "@galacean/engine";

const { SourceAlpha, One, DestinationColor, Zero, OneMinusSourceColor, OneMinusSourceAlpha } = BlendFactor;
const { Add } = BlendOperation;

export function setBlendMode(material: Material, blendMode: BlendMode, premultipliedAlpha: boolean) {
  const target = material.renderState.blendState.targetBlendState;
  switch (blendMode) {
    case BlendMode.Additive:
      target.sourceColorBlendFactor = premultipliedAlpha ? One : SourceAlpha;
      target.destinationColorBlendFactor = One;
      target.sourceAlphaBlendFactor = One;
      target.destinationAlphaBlendFactor = One;
      target.colorBlendOperation = target.alphaBlendOperation = Add;
      break;
    case BlendMode.Multiply:
      target.sourceColorBlendFactor = DestinationColor;
      target.destinationColorBlendFactor = OneMinusSourceAlpha;
      target.sourceAlphaBlendFactor = One;
      target.destinationAlphaBlendFactor = OneMinusSourceAlpha;
      target.colorBlendOperation = target.alphaBlendOperation = Add;
      break;
    case BlendMode.Screen:
      target.sourceColorBlendFactor = One;
      target.destinationColorBlendFactor = OneMinusSourceColor;
      target.sourceAlphaBlendFactor = One;
      target.destinationAlphaBlendFactor = OneMinusSourceColor;
      target.colorBlendOperation = target.alphaBlendOperation = Add;
      break;
    default: // Normal blend default
      target.sourceColorBlendFactor = premultipliedAlpha ? One : SourceAlpha;
      target.destinationColorBlendFactor = OneMinusSourceAlpha;
      target.sourceAlphaBlendFactor = One;
      target.destinationAlphaBlendFactor = OneMinusSourceAlpha;
      target.colorBlendOperation = target.alphaBlendOperation = Add;
      break;
  }
}

export function getBlendMode(material: Material): BlendMode {
  const target = material.renderState.blendState.targetBlendState;

  if (
    target.sourceColorBlendFactor === SourceAlpha &&
    target.destinationColorBlendFactor === One &&
    target.sourceAlphaBlendFactor === One &&
    target.destinationAlphaBlendFactor === One &&
    target.colorBlendOperation === Add &&
    target.alphaBlendOperation === Add
  ) {
    return BlendMode.Additive;
  }

  if (
    target.sourceColorBlendFactor === DestinationColor &&
    target.destinationColorBlendFactor === Zero &&
    target.sourceAlphaBlendFactor === One &&
    target.destinationAlphaBlendFactor === Zero &&
    target.colorBlendOperation === Add &&
    target.alphaBlendOperation === Add
  ) {
    return BlendMode.Multiply;
  }

  if (
    target.sourceColorBlendFactor === One &&
    target.destinationColorBlendFactor === OneMinusSourceColor &&
    target.sourceAlphaBlendFactor === One &&
    target.destinationAlphaBlendFactor === OneMinusSourceColor &&
    target.colorBlendOperation === Add &&
    target.alphaBlendOperation === Add
  ) {
    return BlendMode.Screen;
  }
  return BlendMode.Normal;
}
