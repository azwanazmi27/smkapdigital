// Vite `?raw` import: kandungan fail sebagai teks (digunakan untuk dashboard-spm.html).
declare module "*.html?raw" {
  const content: string;
  export default content;
}
