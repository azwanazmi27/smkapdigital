const root = document.getElementById("relief-root");

try {
  const [{ default: App }, framework] = await Promise.all([
    import("/ekeberadaan-app/assets/page-MSybSbxR.js"),
    import("/ekeberadaan-app/assets/framework-CXnKph_e.js"),
  ]);
  const React = framework.i();
  const ReactDOMModule = framework.t();
  const ReactDOM = ReactDOMModule.default || ReactDOMModule;
  ReactDOM.hydrateRoot(root, React.createElement(App));
} catch (error) {
  console.error("E-Keberadaan gagal dimulakan", error);
  root.innerHTML = `<main class="access-loading"><span>!</span><p>Sistem tidak dapat dimulakan. Sila muat semula halaman.</p></main>`;
}
