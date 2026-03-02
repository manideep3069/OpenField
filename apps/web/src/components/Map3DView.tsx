import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import type { Field } from "../types";

interface Map3DViewProps {
  fields: Field[];
  selectedFieldId: string | null;
  onSelectField: (field: Field | null) => void;
}

function polygonToHierarchy(field: Field): Cesium.PolygonHierarchy {
  const ring = field.boundary.coordinates[0];
  const positions = ring.map(([lng, lat]) => Cesium.Cartesian3.fromDegrees(lng, lat));
  return new Cesium.PolygonHierarchy(positions);
}

export function Map3DView({
  fields,
  selectedFieldId,
  onSelectField,
}: Map3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const fieldsRef = useRef<Field[]>(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: new Cesium.ImageryLayer(
        new Cesium.OpenStreetMapImageryProvider({
          url: "https://a.tile.openstreetmap.org/",
        })
      ),
      baseLayerPicker: false,
      fullscreenButton: true,
      vrButton: false,
      geocoder: true,
      homeButton: true,
      infoBox: false,
      sceneModePicker: true,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: true,
      animation: false,
      useDefaultRenderLoop: true,
      requestRenderMode: false,
    });

    viewerRef.current = viewer;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id) {
        const entityId = (picked.id as Cesium.Entity).id;
        const field = fieldsRef.current.find((f) => f.id === entityId);
        if (field) onSelectField(field);
      } else {
        onSelectField(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Sync entities with fields
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    entitiesRef.current.forEach((e) => viewer.entities.remove(e));
    entitiesRef.current = [];

    fields.forEach((field) => {
      const isSelected = field.id === selectedFieldId;
      const entity = viewer.entities.add({
        id: field.id,
        name: field.name,
        polygon: {
          hierarchy: polygonToHierarchy(field),
          material: isSelected
            ? Cesium.Color.GREEN.withAlpha(0.6)
            : Cesium.Color.GREEN.withAlpha(0.35),
          outline: true,
          outlineColor: isSelected ? Cesium.Color.WHITE : new Cesium.Color(0.0, 0.4, 0.0, 1.0),
          outlineWidth: isSelected ? 3 : 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          fill: true,
        },
      });
      entitiesRef.current.push(entity);
    });
  }, [fields, selectedFieldId]);

  return <div ref={containerRef} className="map-container cesium-viewer" />;
}
