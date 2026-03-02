import { useEffect, useRef, useCallback } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Field } from "../types";

Cesium.Ion.defaultAccessToken = "";

interface Map3DViewProps {
  fields: Field[];
  selectedFieldId: string | null;
  onSelectField: (field: Field | null) => void;
}

function polygonToHierarchy(field: Field): Cesium.PolygonHierarchy {
  const ring = field.boundary.coordinates[0];
  const positions = ring.map(([lng, lat]) =>
    Cesium.Cartesian3.fromDegrees(lng, lat)
  );
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

  const onSelectRef = useRef(onSelectField);
  onSelectRef.current = onSelectField;

  const initViewer = useCallback(() => {
    if (!containerRef.current || viewerRef.current) return;

    const cartoImagery = new Cesium.UrlTemplateImageryProvider({
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      subdomains: ["a", "b", "c", "d"],
      maximumLevel: 19,
      credit: new Cesium.Credit(
        'Map tiles by <a href="https://carto.com/">CARTO</a>, under CC BY 3.0. Data by <a href="https://www.openstreetmap.org/">OpenStreetMap</a>, under ODbL.'
      ),
    });

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(
        Promise.resolve(cartoImagery)
      ),
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: true,
      infoBox: false,
      sceneModePicker: true,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      animation: false,
    });

    viewer.scene.globe.enableLighting = false;
    viewer.scene.screenSpaceCameraController.enableTilt = true;
    viewer.scene.screenSpaceCameraController.enableLook = true;

    viewerRef.current = viewer;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const picked = viewer.scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id) {
          const entityId = (picked.id as Cesium.Entity).id;
          const field = fieldsRef.current.find((f) => f.id === entityId);
          if (field) {
            onSelectRef.current(field);
            return;
          }
        }
        onSelectRef.current(null);
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    return () => {
      handler.destroy();
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cleanup = initViewer();
    return cleanup;
  }, [initViewer]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    entitiesRef.current.forEach((e) => {
      if (viewer.entities.contains(e)) viewer.entities.remove(e);
    });
    entitiesRef.current = [];

    fields.forEach((field) => {
      const isSelected = field.id === selectedFieldId;
      const entity = viewer.entities.add({
        id: field.id,
        name: field.name,
        polygon: {
          hierarchy: polygonToHierarchy(field),
          material: isSelected
            ? Cesium.Color.fromCssColorString("#22c55e").withAlpha(0.65)
            : Cesium.Color.fromCssColorString("#22c55e").withAlpha(0.35),
          outline: true,
          outlineColor: isSelected
            ? Cesium.Color.WHITE
            : Cesium.Color.fromCssColorString("#15803d"),
          outlineWidth: isSelected ? 3 : 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
      entitiesRef.current.push(entity);
    });
  }, [fields, selectedFieldId]);

  return <div ref={containerRef} className="map-container cesium-widget" />;
}
