// pdfjs-dist (used internally by pdf-parse) evaluates `new DOMMatrix()` and
// other canvas-only constructors at module load time. On Vercel/Node serverless
// runtimes those globals do not exist and importing pdf-parse throws
// `ReferenceError: DOMMatrix is not defined`.
//
// We only use pdf-parse for text extraction, never rendering, so installing
// empty stubs is enough to let the module finish initializing. This file MUST
// be imported (for its side effects) before `pdf-parse`.

const g = globalThis as unknown as Record<string, unknown>;

if (typeof g.DOMMatrix === "undefined") {
  class DOMMatrixStub {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(_init?: unknown) {}
    multiply() {
      return this;
    }
    multiplySelf() {
      return this;
    }
    translate() {
      return this;
    }
    translateSelf() {
      return this;
    }
    scale() {
      return this;
    }
    scaleSelf() {
      return this;
    }
    scaleNonUniform() {
      return this;
    }
    rotate() {
      return this;
    }
    rotateSelf() {
      return this;
    }
    invertSelf() {
      return this;
    }
    transformPoint(p: unknown) {
      return p;
    }
  }
  g.DOMMatrix = DOMMatrixStub;
}

if (typeof g.Path2D === "undefined") {
  class Path2DStub {
    constructor(_init?: unknown) {}
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  }
  g.Path2D = Path2DStub;
}

if (typeof g.ImageData === "undefined") {
  class ImageDataStub {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  }
  g.ImageData = ImageDataStub;
}
