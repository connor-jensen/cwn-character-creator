export default function GearBlock({ item, pills, typeLabel }) {
  return (
    <div className="dos-gear-block">
      <div className="dos-gear-name">
        {item.name}
        {typeLabel && <span className="dos-gear-type">{typeLabel}</span>}
      </div>
      <p className="dos-gear-desc">{item.description}</p>
      <div className="dos-gear-pills">
        {pills.map(([label, value]) => (
          <span key={label || value} className="dos-gear-pill">
            {label ? `${label} ${value}` : value}
          </span>
        ))}
      </div>
    </div>
  );
}
