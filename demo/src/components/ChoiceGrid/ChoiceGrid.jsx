export default function ChoiceGrid({ items, selectedChoice, onSelect, prompt, renderSubText }) {
  return (
    <>
      {prompt}
      <div className="choices">
        {items.map((item) => (
          <button
            key={item}
            className={`btn-choice${selectedChoice === item ? " btn-choice-selected" : ""}`}
            onClick={() => onSelect(item)}
          >
            {item}
            {renderSubText && (
              <span className="btn-choice-sub">
                {renderSubText(item)}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
