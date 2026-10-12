# Wonder Home V landing page

Plain ES modules, no bundler. Three.js 0.160.0 from jsdelivr through the importmap in `index.html` and `tour.html`.

## Files

| File | What it is |
|---|---|
| `index.html` | Landing page. Text, prices and the form render with no JavaScript and no WebGL. The 3D layer loads after first paint. |
| `tour.html` | Full 3D tour on its own page. Deep links: `tour.html?mode=plan&level=3&unit=F1` or `tour.html#plan-3-F1`. |
| `wonderhome-data.js` | Single source of truth: plan data (ROOMS, UNITS, DOORS, BOUNDS), wall layout, project facts and prices, scroll keyframes, hotspot pins. No Three.js import. |
| `wonderhome-scene.js` | Materials, merged geometry (Batch), walls, furniture, site, floor shells, roof, lazy interior, and `createScene({ container, mode, viewShift })`. In hero mode it builds the site, shells and roof only. |
| `wonderhome-tour.js` | Tour UI (floor picker, residences panel, plan view, walk mode). `mountTour(ctx, …)` runs on top of the landing page's canvas for Explore in 3D, and on its own in tour.html. |
| `poster.jpg`, `poster-portrait.jpg` | Stills shown before the 3D loads and when WebGL is missing. |
| `AnekLatin.woff2`, `AnekDevanagari.woff2`, `logo-reversed.svg`, `mark-reversed.svg` | Brand fonts (Devanagari subset to the Hindi lines on the page) and logos. |

To change a price, phone number, travel time or the extras line, edit `FACTS` in `wonderhome-data.js`. Both pages update.

## Scroll keyframes

Edit `KEYFRAMES` in `wonderhome-data.js`. The camera sits exactly on a section's pose when that section's top reaches the top of the window, and blends (smoothstep) to the next pose as you scroll on. Scrolling back plays the path in reverse. Units are metres from the centre of the plot: x east, y up, z south (the road and all three 3 BHK balconies are on the +z side).

| Section id | Scroll range | Camera position | Looks at | Lighting and mood |
|---|---|---|---|---|
| `hero` | page top to Overview top | (30, 16, 46) wide from the road corner, same as the tour's exterior view | (0, 11, 0) | Base dusk: sun 1.9, hemi 1.3, street 30, windows 0.95, sky 1.0, exposure 1.05, fog 90 to 260 m, fov 45 |
| `overview` | Overview top to Residences top | (4, 14, 44) square on to the balcony face | (0, 11, 0) | Base |
| `residences` | Residences top to Amenities top | (7, 3.5, 24) low at the footpath, looking up the stacked balconies | (2, 15, 0) | Sky dimmed to 0.7, windows up to 1.8, sun 1.4, street 36, fov 52 |
| `amenities` | Amenities top to Location top | (16, 2.4, 14) stilt level through the columns | Lift lobby (-5, 2.2, -2) | Street light 45, windows 1.5, sky 0.8, fov 50 |
| `location` | Location top to Payment plan top | (34, 52, 72) high and wide, road and neighbouring blocks in frame | (0, 4, -10) | Base, fog pushed out to 150 to 380 m |
| `pay` | Payment plan top to Contact top | (-30, 26, 50) west corner | (0, 10, 0) | Windows 1.2, sky 0.9 |
| `contact` | Contact top to end | (2, 1.7, 21) standing at the road, looking in through the gate | (-6, 1.8, -2) | Deepest dusk: sun 0.9, sky 0.55, street 60, windows 1.8, exposure 0.92, fov 48 |

Other values per keyframe:

- `fitCap`: on portrait screens the camera pulls back by `0.95 / aspect` (the tour's own `fit()` rule), capped at this value so close shots stay outside the building.
- `narrowTargetY`: on portrait screens, the height the camera looks at, so the building sits in the upper half above the text panels.
- `viewShift` in `index.html` moves the rendered frame so the building sits to the right of the panels on desktop (17% of width) and in the upper part on phones (20% of height).

Pointer parallax: ±2.5° yaw, ±1° pitch, damped. Touch screens get a slow idle drift instead (device orientation is not available in the hosted page). After 6 seconds idle the camera orbits slowly at 0.035 rad/s and eases back on any input. With `prefers-reduced-motion`, the camera stays on the hero pose and nothing drifts or orbits.

## Hotspot pins

`PINS` in `wonderhome-data.js` (world positions) and `PIN_RANGES` in `index.html` (where in the scroll each pin is shown, so pins never float over a wall the camera is behind).

| Pin | World position | Click | Open in 3D |
|---|---|---|---|
| 3 BHK balcony | F1 road side balcony, 3rd floor (7.75, 13.3, 10.4) | Scrolls to Residences | Tour, floor plan, 3rd floor, F1 selected |
| Lift and parking | Lift lobby glass at stilt level (-6.56, 2.3, -1.9) | Scrolls to Amenities | Tour, building view |
| Roof | Roof slab (3, 25.6, 6) | Scrolls to Overview | Tour, floor plan, 6th floor |
| Entrance gate | Gate opening (0, 1.6, 13.4) | Scrolls to Location | Tour, building view |

## Poster

`poster.jpg` (1600 x 1000) and `poster-portrait.jpg` (860 x 1864) are rendered from the hero keyframe (scroll 0, no parallax, no orbit) with the same `viewShift` as the live page, so the crossfade has no jump. To re-render after changing the hero keyframe: open `index.html` at that window size, wait for the 3D, and in the console run
`__wh.renderer.render(__wh.scene, __wh.camera); __wh.renderer.domElement.toDataURL('image/jpeg', 0.8)`.

## Performance measures

- Three.js (minified build) is imported only after `load` plus idle time; the text, price, buttons and poster paint first.
- Hero mode: no interior, furniture, labels, OrbitControls or CSS2DRenderer. About 60 draw calls through the merged geometry.
- Pixel ratio capped at 2 on desktop and 1.5 on phones, and dropped in steps of 0.25 if frames stay slow. Shadows on desktop only, with a 1024 shadow map.
- The page renders only when something changes (scroll, pointer, idle orbit, lighting blend). The loop stops when the tab is hidden.
- Lighthouse cannot be run inside the claude.ai artifact viewer. Measure it once the page is on its own domain.
