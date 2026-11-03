// Compiled by tests/typed-integrations.test.js against the installed
// maplibre-gl and Tiptap, so the structural types the components declare
// keep accepting the real modules, and a page keeps the full library types
// through `instance.map` and `instance.editor`, however it initialized.
import * as maplibregl from 'maplibre-gl';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MapView } from '../../../src/ts/components/mapView';
import { RichTextEditor } from '../../../src/ts/components/richTextEditor';

const maps = [
  new MapView(document.body, { maplibregl }),
  MapView.init(document.body, { maplibregl }),
  ...MapView.init(document.querySelectorAll('.map'), { maplibregl })
];
for (const { map } of maps) {
  if (!map) continue;
  map.once('load', () => {});
  map.fitBounds([[0, 0], [1, 1]]);
  map.on('click', 'stores-points', (event) => event.features?.[0]?.properties);
  new maplibregl.Marker().setLngLat([0, 0]).addTo(map);
}

const editors = [
  new RichTextEditor(document.body, { Editor, extensions: [StarterKit] }),
  RichTextEditor.init(document.body, { Editor, extensions: [StarterKit] }),
  ...RichTextEditor.init(document.querySelectorAll('.rich-text-editor'), { Editor, extensions: [StarterKit] })
];
for (const { editor } of editors) {
  if (!editor) continue;
  editor.chain().focus().toggleBold().run();
  editor.can().toggleBold();
  editor.commands.setContent('<p>Replaced</p>');
}
