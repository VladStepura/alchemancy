const PIXI = require('pixi.js')

const Util = require('./util')

module.exports = class Layer {
  constructor ({ renderer, width, height }) {
    this.renderer = renderer
    this.width = width
    this.height = height
    this.sprite = new PIXI.Sprite(PIXI.RenderTexture.create(this.width, this.height))
    this.dirty = false
  }
  getOpacity () {
    return this.sprite.alpha
  }
  setOpacity (opacity) {
    this.sprite.alpha = opacity
  }
  pixels (postDivide = false) {
    // get pixels as Uint8Array
    // see: http://pixijs.download/release/docs/PIXI.extract.WebGLExtract.html
    const pixels = this.renderer.plugins.extract.pixels(this.sprite.texture)
    if (postDivide) {
      // un-premultiply
      Util.arrayPostDivide(pixels)
    }
    return pixels
  }
  toCanvas (postDivide = true) {
    let pixels = this.pixels(postDivide)

    return Util.pixelsToCanvas(
      pixels,
      this.width,
      this.height
    )
  }
  // get data url in PNG format
  toDataURL (postDivide = true) {
    return this.toCanvas(postDivide).toDataURL()
  }
  // get PNG data for writing to a file
  export (index) {
    return Util.dataURLToFileContents(
      this.toDataURL()
    )
  }
  // renders a DisplayObject to this layer’s texture
  draw (displayObject, clear = false) {
    this.renderer.render(
      displayObject,
      this.sprite.texture,
      clear
    )
  }
  clear () {
    // FIXME why doesn't this work consistently?
    // clear the render texture
    // this.renderer.clearRenderTexture(this.sprite.texture)

    // HACK force clear :/
    this.draw(
      PIXI.Sprite.from(PIXI.Texture.EMPTY),
      true
    )
  }
  // draws a (non-DisplayObject) source to a texture (usually an Image)
  replace (source, clear = true) {
    this.draw(
      new PIXI.Sprite.from(source), // eslint-disable-line new-cap
      clear
    )
  }

  // source should be an HTMLCanvasElement
  replaceTextureFromCanvas (canvasElement) {
    // delete ALL cached canvas textures to ensure canvas is re-rendered
    PIXI.utils.clearTextureCache()
    // draw canvas to our sprite's RenderTexture
    this.replace(
      PIXI.Texture.from(canvasElement)
    )
  }

  // write to texture (ignoring alpha)
  // TODO beter name for this?
  rewrite () {
    // temporarily reset the sprite alpha
    let alpha = this.sprite.alpha

    // write to the texture
    this.sprite.alpha = 1.0
    this.replaceTexture(this.sprite)

    // set the sprite alpha back
    this.sprite.alpha = alpha
  }
  // NOTE this will apply any source Sprite alpha (if present)
  // TODO might be a better way to do this.
  //      would be more efficient to .render over sprite instead (with clear:true)
  //      but attempting that resulted in a blank texture.
  // see also: PIXI's `generateTexture`
  replaceTexture (displayObject) {
    let rt = PIXI.RenderTexture.create(this.width, this.height)
    this.renderer.render(
      displayObject,
      rt,
      true
    )
    this.sprite.texture = rt
  }
  // NOTE this is slow
  isEmpty () {
    let pixels = this.renderer.plugins.extract.pixels(this.sprite.texture)
    for (let i of pixels) {
      if (i !== 0) return false
    }
    return true
  }
  getDirty () {
    return this.dirty
  }
  setDirty (value) {
    this.dirty = value
  }

  setVisible (value) {
    this.sprite.visible = value
  }
  getVisible () {
    return this.sprite.visible
  }

  //
  //
  // operations
  //
  flip (vertical = false) {
    let sprite = new PIXI.Sprite(this.sprite.texture)
    sprite.anchor.set(0.5, 0.5)
    if (vertical) {
      sprite.pivot.set(-sprite.width / 2, sprite.height / 2)
      sprite.scale.y *= -1
    } else {
      sprite.pivot.set(sprite.width / 2, -sprite.height / 2)
      sprite.scale.x *= -1
    }
    this.replaceTexture(sprite)
  }
}
