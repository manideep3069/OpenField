import type { Field } from "../types";

interface FieldListProps {
  fields: Field[];
  onDelete?: (id: string) => void;
  onSelect?: (field: Field) => void;
}

export function FieldList({ fields, onDelete, onSelect }: FieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="field-list empty">
        <p>No fields yet. Draw one on the map.</p>
      </div>
    );
  }
  return (
    <ul className="field-list">
      {fields.map((f) => (
        <li key={f.id} className="field-item">
          <button
            type="button"
            className="field-name"
            onClick={() => onSelect?.(f)}
          >
            {f.name}
          </button>
          {f.area_ha != null && (
            <span className="field-area">{f.area_ha.toFixed(2)} ha</span>
          )}
          {onDelete && (
            <button
              type="button"
              className="field-delete"
              onClick={() => onDelete(f.id)}
              aria-label={`Delete ${f.name}`}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
