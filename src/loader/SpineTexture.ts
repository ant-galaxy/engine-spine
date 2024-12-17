import { Texture, TextureFilter, TextureWrap } from "@esotericsoftware/spine-core";
import { Texture2D, TextureFilterMode, TextureWrapMode } from "@galacean/engine";

/**
 * @internal
 */
export class SpineTexture extends Texture {
  constructor(image: Texture2D) {
    super(image);
    image.generateMipmaps();
  }

  // rewrite getImage function, return galacean texture2D, then attachment can get size of texture
  getImage(): Texture2D {
    return this._image;
  }

  setFilters(minFilter: TextureFilter, magFilter: TextureFilter) {
    if (minFilter === TextureFilter.Nearest) {
      this._image.filterMode = TextureFilterMode.Point;
    } else if (magFilter === TextureFilter.MipMapLinearLinear) {
      this._image.filterMode = TextureFilterMode.Trilinear;
    } else {
      this._image.filterMode = TextureFilterMode.Bilinear;
    }
  }

  setWraps(uWrap: TextureWrap, vWrap: TextureWrap) {
    this._image.wrapModeU = this._convertWrapMode(uWrap);
    this._image.wrapModeV = this._convertWrapMode(vWrap);
  }

  dispose() {}

  private _convertWrapMode(wrap: TextureWrap): TextureWrapMode {
    switch (wrap) {
      case TextureWrap.ClampToEdge:
        return TextureWrapMode.Clamp;
      case TextureWrap.Repeat:
        return TextureWrapMode.Repeat;
      case TextureWrap.MirroredRepeat:
        return TextureWrapMode.Mirror;
      default:
        throw new Error("Unsupported texture wrap mode.");
    }
  }
}
