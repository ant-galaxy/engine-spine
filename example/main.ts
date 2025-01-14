import {
  AssetType,
  Camera,
  Engine,
  Entity,
  KTX2TargetFormat,
  Logger,
  Texture2D,
  Vector3,
  WebGLEngine,
  request
} from "@galacean/engine";
import * as dat from "dat.gui";
import { SpineAnimationRenderer, TextureAtlas } from "../src/index";
import { SpineResource } from "../src/loader/SpineResource";

Logger.enable();
console.log(SpineAnimationRenderer);

document.getElementById("canvas")!.oncontextmenu = function (e) {
  e.preventDefault();
  e.stopPropagation();
};

const gui = new dat.GUI({ name: "My GUI" });

let animationController; // 动画切换
let skinController; // 皮肤切换
let outline; // 包围盒
const blobResource: any = {
  urls: [],
  params: {
    fileExtensions: []
  }
};

const baseDemo = "spineBoy-单json";
const demos = {
  "spineBoy-单json": {
    url: "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/yKbdfgijyLGzQDyQ/spineboy/spineboy.json"
  },
  "raptor-三文件json": {
    urls: [
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/jdjQ6mGxWknZ7TtQ/raptor/raptor.json",
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/jdjQ6mGxWknZ7TtQ/raptor/raptor.atlas",
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/jdjQ6mGxWknZ7TtQ/raptor/raptor.png"
    ]
  },
  "三文件-无后缀bin": {
    urls: [
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*Go0FQ6FlurEAAAAAAAAAAAAAAQAAAQ?a=.bin",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*AjmGS7wM-2UAAAAAAAAAAAAAAQAAAQ?b=.atlas",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/img/A*BXnORpJ85ywAAAAAAAAAAAAAAQAAAQ/original?c=.png"
    ]
  },
  ktx2: {
    urls: [
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*Go0FQ6FlurEAAAAAAAAAAAAAAQAAAQ?a=.bin",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*AjmGS7wM-2UAAAAAAAAAAAAAAQAAAQ?b=.atlas",
      "https://mdn.alipayobjects.com/oasis_be/afts/img/A*i5qRTKgPlYMAAAAAAAAAAAAADkp5AQ/original/DR.ktx2"
    ]
  },
  皮肤切换: {
    urls: [
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/24ejL92gvbWxsXRi/mix-and-match/mix-and-match.json",
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/24ejL92gvbWxsXRi/mix-and-match/mix-and-match.atlas",
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/24ejL92gvbWxsXRi/mix-and-match/mix-and-match.png"
    ],
    scene: "changeSkin"
  },
  多贴图: {
    urls: [
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*yN21QbvPtQUAAAAAAAAAAAAAAQAAAQ?af_fileName=dr.skel",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*BPMZQqwNlYQAAAAAAAAAAAAAAQAAAQ?af_fileName=dr.atlas",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/img/A*A6ObTo3ME8sAAAAAAAAAAAAAAQAAAQ/original?a=.png",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/img/A*85eWSZYpWKgAAAAAAAAAAAAAAQAAAQ/original?b=.png"
    ]
  },
  物理: {
    urls: [
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*cVzySIX09aQAAAAAAAAAAAAAAQAAAQ?af_fileName=dr.skel",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*7LzLSJLjBK4AAAAAAAAAAAAAAQAAAQ?af_fileName=dr.atlas",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/img/A*uySHT5k_PU0AAAAAAAAAAAAAAQAAAQ/original?a=.png"
    ]
  },
  "物理-少女": {
    urls: [
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*Po6oQJyLdb0AAAAAAAAAAAAAAQAAAQ?a=.json",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*CnqHS5nRzTIAAAAAAAAAAAAAAQAAAQ?b=.atlas",
      "https://mdn.alipayobjects.com/portal_h1wdez/afts/img/A*WDXeRIpd-lAAAAAAAAAAAAAAAQAAAQ/original?b=.png"
    ],
    scene: "physic"
  },
  素材替换: {
    url: "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/yKbdfgijyLGzQDyQ/spineboy/spineboy.json",
    scene: "changeResource"
  },
  编辑器: {
    project: "https://mdn.alipayobjects.com/portal_h1wdez/afts/file/A*pPKPSpov008AAAAAAAAAAAAAAQAAAQ",
    url: "/yuyouyou.json",
    scene: "editor"
  },
  本地上传文件: {
    url: "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/kx5353rrNIDn4CsX/spineboy-pro/spineboy-pro.json",
    scene: "upload"
  }
};

WebGLEngine.create({
  canvas: "canvas",
  ktx2Loader: {
    workerCount: 4,
    priorityFormats: [KTX2TargetFormat.ASTC, KTX2TargetFormat.ETC, KTX2TargetFormat.PVRTC]
  }
}).then(async (engine) => {
  engine.canvas.resizeByClientSize();
  engine.run();

  engine.canvas.resizeByClientSize();
  const scene = engine.sceneManager.activeScene;
  const root = scene.createRootEntity();
  scene.addRootEntity(root);

  const cameraEntity = root.createChild("camera_node");
  const camera = cameraEntity.addComponent(Camera);
  cameraEntity.transform.position = new Vector3(0, 0, 20);
  camera.nearClipPlane = 0.001;
  camera.farClipPlane = 20000;

  // cameraEntity.addComponent(OrbitControl);
  // cameraEntity.addComponent(Stats);

  loadSpine(root, engine, demos[baseDemo]);

  gui.add({ name: baseDemo }, "name", Object.keys(demos)).onChange((demoName) => {
    const spineEntity = root.findByName("spine-entity");
    if (spineEntity) {
      spineEntity.destroy();
    }
    loadSpine(root, engine, demos[demoName]);
  });
});

async function loadSpine(root: Entity, engine: Engine, resource) {
  let spineResource: SpineResource | null = null;
  const { scene } = resource;
  if (scene === "editor") {
    const data = await request(resource.project, { type: "json" });
    // @ts-ignore
    engine.resourceManager.initVirtualResources(data.files);
  }
  try {
    spineResource = (await engine.resourceManager.load({
      ...resource,
      type: "spine"
    })) as SpineResource;
  } catch (err) {
    console.error("spine asset load error: ", err);
  }

  if (!spineResource) return;
  if (scene === "upload") {
    console.log(blobResource);
    loadSpine(root, engine, blobResource);
    return;
  }
  console.log("spine asset loaded =>", spineResource.skeletonData);
  removeController();
  const animationNames = spineResource.skeletonData.animations.map((item) => item.name);
  const firstAnimation = animationNames[0];

  const spineEntity = new Entity(engine, "spine-entity");
  spineEntity.transform.setPosition(0, -2.5, 0);
  const spineAnimation = spineEntity.addComponent(SpineAnimationRenderer);
  if (scene === "physic") {
    spineAnimation.premultipliedAlpha = true;
    spineEntity.transform.setScale(0.5, 0.5, 0.5);
  }
  spineAnimation.resource = spineResource;
  root.addChild(spineEntity);

  // const clone = spineEntity.clone();
  // clone.name = 'test';
  // clone.transform.setPosition(25, -15, 0);
  // const animation2 = clone.getComponent(SpineAnimationRenderer);
  // animation2!.defaultState.skinName = 'full-skins/boy';
  // animation2!.defaultState.scale = 0.04;
  // animation2!.defaultState.animationName = 'dance';
  // animation2!.defaultState.loop = true;
  // root.addChild(clone);

  // const outlineEntity = root.createChild('outline');
  // outline = outlineEntity.addComponent(BoundingBoxLine);
  // outline.attachToEntity(spineEntity);
  // outline.isActive = true;
  // setInterval(() => {
  //   outline.updateVertices();
  // }, 67);

  spineAnimation.state.setAnimation(0, firstAnimation, true);
  animationController = gui
    .add({ animation: firstAnimation }, "animation", animationNames)
    .onChange((animationName) => {
      spineAnimation.state.setAnimation(0, animationName, true);
    });

  if (scene === "changeSkin") {
    handleChangeSkinScene(spineAnimation);
  }

  if (scene === "changeResource") {
    handleChangeResource(engine, spineAnimation);
  }
}

function handleChangeSkinScene(spineAnimation: SpineAnimationRenderer) {
  const { skeleton } = spineAnimation;
  skeleton.setSkinByName("full-skins/girl"); // 1. Set the active skin
  skeleton.setSlotsToSetupPose(); // 2. Use setup pose to set base attachments.
  const info = {
    skin: "full-skins/girl"
  };
  skinController = gui
    .add(info, "skin", [
      "full-skins/girl",
      "full-skins/girl-blue-cape",
      "full-skins/girl-spring-dress",
      "full-skins/boy"
    ])
    .onChange((skinName) => {
      skeleton.setSkinByName(skinName); // 1. Set the active skin
      skeleton.setSlotsToSetupPose(); // 2. Use setup pose to set base attachments.
    });
}

async function handleChangeResource(engine: Engine, spineAnimation: SpineAnimationRenderer) {
  const newResource = (await engine.resourceManager.load({
    urls: [
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/jdjQ6mGxWknZ7TtQ/raptor/raptor.json",
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/jdjQ6mGxWknZ7TtQ/raptor/raptor.atlas",
      "https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/jdjQ6mGxWknZ7TtQ/raptor/raptor.png"
    ],
    type: "spine"
  })) as SpineResource;
  setTimeout(() => {
    spineAnimation.defaultConfig.animationName = "roar";
    spineAnimation.resource = newResource;
  }, 1000);
}

function removeController() {
  if (animationController) {
    animationController.remove();
    animationController = null;
  }
  if (skinController) {
    skinController.remove();
    skinController = null;
  }
}

window.onload = function () {
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;
  const linkContainer = document.getElementById("linkContainer");
  fileInput.addEventListener("change", function (event) {
    const files = fileInput.files;
    if (files) {
      // Clear previous links
      if (linkContainer) {
        linkContainer.innerHTML = "";
      }

      // Create and display a temporary link for each file
      Array.from(files).forEach((file, index) => {
        const tempLink = URL.createObjectURL(file);
        const ext = getFileExtension(file);
        blobResource.urls.push(tempLink);
        blobResource.params.fileExtensions.push(ext);
        console.log(blobResource);
      });
    }
  });
};

function getFileExtension(file: File): string {
  const fileName = file.name;
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return "";
  }
  return fileName.substring(lastDotIndex + 1);
}

function delay(time: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res(true);
    }, time);
  });
}
