export default function SectionHeader({ num, label }) {
  return (
    <div className="dos-section-hdr">
      <span className="dos-section-num">{num}</span>
      <span className="dos-section-lbl">{label}</span>
      <div className="dos-section-rule" />
    </div>
  );
}
