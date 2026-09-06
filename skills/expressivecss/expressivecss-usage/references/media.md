# Media styles foundation

Read this after the Usage guide when a task uses responsive images, native video, or embedded media. Resolve the installed ExpressiveCSS version first. The [target-version Media styles documentation](https://www.expressivecss.com/media-css.html.md) and [helper Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_helpers.scss) override this summary if they differ.

## Choose the media treatment

| Class | Required element or host | Result |
| --- | --- | --- |
| `.responsive-img` | `<img>` | Caps the rendered width at its container, preserves the intrinsic ratio with `height: auto`, and adds 12px corners. |
| `.responsive-video` | `<video>` | Caps the rendered width at its container, preserves the intrinsic ratio with `height: auto`, and adds 12px corners. |
| `.video-container` | Wrapper around an `<iframe>`, `<object>`, or `<embed>` | Creates a clipped `16 / 9` box with 12px corners and makes the embedded child fill it. |
| `.circle` | Usually an `<img>` with equal rendered width and height | Applies a 50% radius. On `.responsive-img.circle`, this replaces the normal 12px media radius. |

`.responsive-img` only affects `<img>` elements, and `.responsive-video` only affects `<video>` elements. Putting either class on a wrapper or another element does nothing. The responsive classes cap width rather than forcing it, so a small source does not stretch to fill a wider container.

```html
<img
  class="responsive-img"
  src="quarterly-sales.png"
  width="1200"
  height="675"
  alt="Quarterly sales increased from 1.2 to 1.5 million dollars"
>

<div class="video-container">
  <iframe
    src="https://example.com/embed/product-tour"
    title="Product tour"
    allowfullscreen
  ></iframe>
</div>
```

## Image rules

- Keep intrinsic `width` and `height` attributes when known. They reserve the aspect ratio before the image loads and reduce layout movement.
- Use `.circle` only when the rendered box is square. A rectangular image becomes an ellipse unless application CSS also controls its aspect ratio and crop.
- Add `object-fit: cover` in application CSS when a fixed crop is part of the design. ExpressiveCSS does not set `object-fit` for these helpers.
- Use a meaningful `alt` value when the image conveys information. Use an empty `alt` attribute (`alt=""`) for a decorative image.
- Do not put essential text only inside an image. Repeat it as text when users must read, copy, translate, or zoom it.

## Video and embed rules

A native `<video class="responsive-video">` keeps its own aspect ratio. Add `controls` unless the page supplies an equivalent accessible control set. Provide captions for spoken content and meaningful audio, plus a transcript when the content requires one.

`.video-container` fixes its box at 16:9. Its descendant `iframe`, `object`, or `embed` is absolutely positioned with `inset: 0`, `width: 100%`, and `height: 100%`. The wrapper clips overflow. Give every `<iframe>` a useful `title`. Treat an embedded third-party player as an external dependency and test keyboard access, focus order, consent behavior, loading failure, and fullscreen.

Use application CSS instead of `.video-container` when the source is not 16:9. Override `aspect-ratio` on a dedicated application class rather than distorting the embedded content.

## Verification

Check the media at every reachable container width, not only at viewport boundaries. Confirm that images do not upscale unexpectedly, circles remain circular, media corners are not double-clipped by a parent, embeds keep the intended ratio, and loading does not move nearby content. Test image alternatives, captions, iframe names, keyboard controls, fullscreen, reduced data or failed network states, and right-to-left layout where surrounding controls can move.
