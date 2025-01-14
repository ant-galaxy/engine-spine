

# Galacean Engine Spine Runtime


![](https://img.shields.io/npm/v/@galacean/engine-spine#id=QfHW0&originHeight=20&originWidth=80&originalType=binary&ratio=1&status=done&style=none)
![](https://img.shields.io/bundlephobia/minzip/@galacean/engine-spine#id=yUnp4&originHeight=20&originWidth=144&originalType=binary&ratio=1&status=done&style=none)
![](https://img.shields.io/npm/dm/@galacean/engine-spine#id=lqs8U&originHeight=20&originWidth=134&originalType=binary&ratio=1&status=done&style=none)

---

[@galacean/engine-spine](https://www.npmjs.com/package/@galacean/engine-spine) is the Spine runtime module for the [Galacean engine](https://github.com/galacean/engine), providing efficient support for Spine animations. This package enables developers to seamlessly integrate and use Spine animations, delivering smooth skeletal animation effects optimized for both web and mobile platforms.

##
## Installation

Install **@galacean/engine-spine** via npm:

```bash
npm install @galacean/engine-spine
```


## Quick Start

Here's a simple example to get started with **@galacean/engine-spine**:

```typescript
import { SpineAnimationRenderer } from '@galacean/engine-spine';

// First setup for galacean engine, get scene and create root entity.
// Find setup code here:

// And then load spine resource and instantiate a spine entity with the resource.
const spineResource = await engine.resourceManager.load({
  url: 'https://mdn.alipayobjects.com/huamei_kz4wfo/uri/file/as/2/kz4wfo/4/mp/yKbdfgijyLGzQDyQ/spineboy/spineboy.json',
  type: 'spine',
});
const spineEntity = spineResource.instantiate();
rootEntity.addChild(spineEntity);
```

## API Documentation

For a detailed overview of the API, including all classes, methods, and properties, please refer to the [Full API Documentation](https://galacean.antgroup.com/engine/en/docs/graphics/2D/spine/api/).


## Version Compatibility

### Package and Spine Version Compatibility

| Package Version | Spine Version         |
|-----------------|-----------------------|
| Below 4.0       | Spine 3.8             |
| 4.0             | Spine 4.0             |
| 4.1             | Spine 4.1             |
| 4.2             | Spine 4.2             |
| 4.x (e.g., 4.0, 4.1) | Corresponds to Spine x.x    |
| 4.x.y (minor version `y`) | Independent from Spine |

> Note: Ensure that the package version aligns with the corresponding Spine editor version for compatibility.

### Package and Galacean Engine Version Compatibility

| Package Version | Galacean Engine Version |
|-----------------|-------------------------|
| 4.0 and above   | 1.3 and above           |
| Below 4.0 (e.g., 1.2.0) | 1.2             |

> Note: Please verify that the versions of both the package and the Galacean Engine are compatible, as mismatched versions may cause unexpected issues.


## Building and Development

To set up the project for development and build it for production, follow these steps:

1. **Install dependencies**:
```bash
npm install
```
2. **Start development environment**:
```bash
npm run dev
```
3. **Build for production**:
```bash
npm run build
```
4. **Run examples**:
```bash
npm run example
```



## Links
- [Examples](https://galacean.antgroup.com/engine/en/docs/graphics/2D/spine/example/) - View usage examples for common scenarios.
- [User Guide](https://galacean.antgroup.com/engine/en/docs/graphics/2D/spine/overview/) - Comprehensive guide for using this package within the Galacean editor and in scripts.
- [API Reference](https://galacean.antgroup.com/engine/en/docs/graphics/2D/spine/api/) - Complete API documentation for all available classes, methods, and properties.


## License
The Galacean Engine is released under the [MIT](https://opensource.org/licenses/MIT) license. See LICENSE file.
