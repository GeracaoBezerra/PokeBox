export default function Field({ label, htmlFor, error, children }) {
  return (
    <>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      <div id={`${htmlFor}-erro`} className="err" role={error ? "alert" : undefined}>
        {error}
      </div>
    </>
  );
}
