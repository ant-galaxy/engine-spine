import { CullMode, Engine, Material, RenderQueueType, Shader } from "@galacean/engine";
import { setBlendMode } from "../util/BlendMode";
import { BlendMode } from "@esotericsoftware/spine-core";

export class SpineMaterial extends Material {
  private static _spineVS = `
    uniform mat4 renderer_MVPMat;

    attribute vec3 POSITION;
    attribute vec2 TEXCOORD_0;
    attribute vec4 COLOR_0;
    
    varying vec2 v_uv;
    varying vec4 v_color;
    
    void main()
    {
      gl_Position = renderer_MVPMat * vec4(POSITION, 1.0);
    
      v_uv = TEXCOORD_0;
      v_color = COLOR_0;
    }
  `;

  private static _spineFS = `
    uniform sampler2D material_SpineTexture;

    varying vec2 v_uv;
    varying vec4 v_color;
    
    void main()
    {
        vec4 baseColor = texture2D(material_SpineTexture, v_uv);
        gl_FragColor = baseColor * v_color;
    }
   `;
  constructor(engine: Engine) {
    const shader =
      Shader.find("galacean-spine-shader") ||
      Shader.create("galacean-spine-shader", SpineMaterial._spineVS, SpineMaterial._spineFS);
    super(engine, shader);
    const renderState = this.renderState;
    const target = renderState.blendState.targetBlendState;
    target.enabled = true;
    setBlendMode(this, BlendMode.Normal, false);
    renderState.depthState.writeEnabled = false;
    renderState.rasterState.cullMode = CullMode.Off;
    renderState.renderQueueType = RenderQueueType.Transparent;
  }
}
