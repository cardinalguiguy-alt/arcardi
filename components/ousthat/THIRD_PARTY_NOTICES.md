# Third-party notices — Où's that ?

## GeoGuessr Explorer vocabulary

The country-search vocabulary in `countries.js` follows the factual set of
countries and territories displayed by GeoGuessr's official Explorer on
2026-09-06:

- source: https://www.geoguessr.com/explorer
- copied scope: ISO 3166-1 alpha-2 identifiers for the displayed destinations
- not copied: source code, UI code, artwork, map imagery or game logic

Country names are produced locally with `Intl.DisplayNames`, and flag glyphs
are generated from ISO codes. The selection and scoring interfaces were
implemented independently for Arcardi.

## WorldGuessr location records

The 40 panorama records in `locations.js` were extracted from
`data/diverse-locations.json` at WorldGuessr revision:

- repository: https://github.com/codergautam/worldguessr
- last MIT revision used: `ef88928c03a70d77ce5a1c86fddf74814ff67fc7`
- source path: `data/diverse-locations.json`
- copied fields: latitude, longitude, heading, panorama ID and country code
- license announcement:
  https://forum.swordbattle.io/t/a-brighter-future-for-worldguessr-important-licensing-update/31899

The audit performed for this module found that the current WorldGuessr head
was `0a939aabc60392f76b8bb9362f208208ed13c38a` and carried the PolyForm
Noncommercial 1.0.0 license. No code or data introduced after the MIT revision
above was copied. Arcardi's game engine, score, synchronization and interface
were implemented independently.

MIT License

Copyright (c) 2024 Gautam Anand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## MapLibre GL JS

The answer map uses MapLibre GL JS 4.7.1, installed from npm (`maplibre-gl`).
MapLibre GL JS is distributed under the BSD 3-Clause License. Its complete
package license is shipped in `node_modules/maplibre-gl/LICENSE.txt` after
installation and is available upstream at
https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/LICENSE.txt

## OpenFreeMap

The detailed vector map uses OpenFreeMap's public Liberty style at
`https://tiles.openfreemap.org/styles/liberty`. It requires no account or API
key. OpenFreeMap publishes its server and style code under open-source
licenses and serves map data derived from OpenStreetMap. Attribution remains
visible in MapLibre's attribution control:

- https://openfreemap.org/quick_start/
- https://github.com/hyperknot/openfreemap

## OpenStreetMap

Map data is provided by OpenStreetMap contributors through OpenFreeMap.
Attribution is kept visible in the MapLibre control. OpenStreetMap data is
available under the Open Database License:
https://www.openstreetmap.org/copyright

## Google Maps Embed

Street-level imagery is delivered by Google's Maps Embed API. No Google code,
imagery or credentials are stored in this repository. Deployers provide their
own restricted public API key and remain responsible for Google Maps Platform
terms, branding and service availability:
https://developers.google.com/maps/documentation/embed/usage-and-billing
